// Preserve source text verbatim in storage. Only split it for safe presentation.
// Supported markup is intentionally narrow: fenced/inline code and math
// delimiters. HTML, Markdown links and attributes are NOT interpreted.
const FENCE = String.fromCharCode(96).repeat(3);
const BACKTICK = String.fromCharCode(96);
const OPEN_FENCE = new RegExp('^[ \\t]*' + FENCE + '([A-Za-z0-9_+.#-]{0,24})[ \\t]*$');
const CLOSE_FENCE = new RegExp('^[ \\t]*' + FENCE + '[ \\t]*$');
const INLINE_MATH = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\r\n]{1,500}\$/g;
const INLINE = new RegExp(INLINE_MATH.source + '|' + BACKTICK +
  '[^' + BACKTICK + '\\r\\n]+' + BACKTICK, 'g');

export function splitInlineContent(value) {
  const source = String(value ?? '');
  const output = [];
  let offset = 0;
  for (const match of source.matchAll(INLINE)) {
    const index = match.index;
    if (index > offset) output.push({ type: 'text', value: source.slice(offset, index) });
    const raw = match[0];
    if (raw.startsWith(BACKTICK)) {
      output.push({ type: 'code', value: raw.slice(1, -1) });
    } else {
      const delimiter = raw.startsWith('$$') || raw.startsWith('\\[') || raw.startsWith('\\(') ? 2 : 1;
      const tex = raw.slice(delimiter, -delimiter);
      if (tex.trim() && tex.length <= 3000) {
        output.push({ type: 'math', value: tex, display: raw.startsWith('$$') || raw.startsWith('\\[') });
      } else {
        output.push({ type: 'text', value: raw });
      }
    }
    offset = index + raw.length;
  }
  if (offset < source.length || !output.length) output.push({ type: 'text', value: source.slice(offset) });
  return output;
}

export function splitRichContent(value) {
  const source = String(value ?? '');
  const lines = source.split(/\r?\n/);
  const blocks = [];
  let textStart = 0;
  let index = 0;
  while (index < lines.length) {
    const opener = OPEN_FENCE.exec(lines[index]);
    if (!opener) { index += 1; continue; }
    let closer = index + 1;
    while (closer < lines.length && !CLOSE_FENCE.test(lines[closer])) closer += 1;
    if (closer === lines.length) { index += 1; continue; }
    if (index > textStart) blocks.push({ type: 'text', parts: splitInlineContent(lines.slice(textStart, index).join('\n')) });
    blocks.push({ type: 'codeBlock', language: opener[1] || '', value: lines.slice(index + 1, closer).join('\n') });
    index = closer + 1;
    textStart = index;
  }
  if (textStart < lines.length || !blocks.length) {
    blocks.push({ type: 'text', parts: splitInlineContent(lines.slice(textStart).join('\n')) });
  }
  return blocks;
}
