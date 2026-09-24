import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitInlineContent, splitRichContent } from '../src/rich-content.mjs';
import { parseMcqJson, validateMcq } from '../src/examMcqImport.js';

const slash = String.fromCharCode(92);
const fence = String.fromCharCode(96).repeat(3);

test('Unicode math and original whitespace remain unchanged', () => {
  const source = 'x₁² + y² = z²\n∫₀¹ f(x) dx ≤ π\n  Indented line';
  assert.deepEqual(splitRichContent(source), [{ type:'text', parts:[{ type:'text', value:source }] }]);
});

test('LaTeX inline and display delimiters are parsed without normalizing the expression', () => {
  const inline = '$' + slash + 'frac{x_1}{2}$';
  const display = '$$' + slash + 'sum_{n=1}^{10} n$$';
  const bracket = slash + '[' + slash + 'sqrt{x}' + slash + ']';
  const paren = slash + '(' + 'a^2+b^2' + slash + ')';
  const tokens = splitInlineContent('A ' + inline + '\n' + display + '\n' + bracket + ' ' + paren);
  const math = tokens.filter(t => t.type === 'math');
  assert.equal(math.length,4);
  assert.deepEqual(math.map(t=>t.display),[false,true,true,false]);
  assert.deepEqual(math.map(t=>t.value),[
    slash + 'frac{x_1}{2}', slash + 'sum_{n=1}^{10} n', slash + 'sqrt{x}', 'a^2+b^2'
  ]);
});

test('multiline programming blocks keep indentation, braces, operators and code language', () => {
  const code = "    if (x < 2) {\n\treturn '<script>alert(1)</script>';\n    }";
  const source = 'Question:\n' + fence + 'javascript\n' + code + '\n' + fence + '\nWhat prints?';
  const blocks = splitRichContent(source);
  assert.equal(blocks.length,3);
  assert.equal(blocks[1].type,'codeBlock');
  assert.equal(blocks[1].language,'javascript');
  assert.equal(blocks[1].value,code);
  assert.equal(blocks[0].parts[0].value,'Question:\n');
});

test('inline code and literal HTML are text, never executable markup', () => {
  const source = 'Use ' + String.fromCharCode(96) + 'x < 2' + String.fromCharCode(96) + ' <img src=x onerror=alert(1)>';
  const parts = splitInlineContent(source);
  assert.deepEqual(parts,[
    {type:'text',value:'Use '},{type:'code',value:'x < 2'},
    {type:'text',value:' <img src=x onerror=alert(1)>'}
  ]);
  const renderer = readFileSync(new URL('../src/RichContent.js',import.meta.url),'utf8');
  assert.doesNotMatch(renderer,/dangerouslySetInnerHTML|eval\s*\(|new Function\s*\(/);
  assert.match(renderer,/trust:\s*false/);
  assert.match(renderer,/throwOnError:\s*true/);
});

test('invalid or unmatched formatting stays readable and is not dropped', () => {
  const raw = 'Unclosed ' + fence + 'python\n    x = 7';
  assert.equal(splitRichContent(raw).map(b=>b.parts?.map(p=>p.value).join('') || b.value).join(''),raw);
  const longMath = '$' + 'x'.repeat(501) + '$';
  assert.equal(splitInlineContent(longMath).map(t=>t.value).join(''),longMath);
});

test('JSON import retains math Unicode and first-line code indentation exactly', () => {
  const code = '    x₁² + y² = z²\n\treturn a < b;';
  const item = { subject:'MTH101',term:'midterm',question:code,
    options:['  '+slash+'frac{1}{2}','    if (a < b) {\n      return a;\n    }','∑ᵢ xᵢ','π ≥ 3'],
    answer:0,explanation:'  Use '+slash+'frac{a}{b} exactly.' };
  const parsed = parseMcqJson(JSON.stringify([item]));
  const normalized = validateMcq(parsed[0],0,{forImport:true});
  assert.equal(normalized.question,code);
  assert.deepEqual(normalized.options,item.options);
  assert.equal(normalized.explanation,item.explanation);
});
