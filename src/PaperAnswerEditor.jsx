// src/PaperAnswerEditor.jsx — a Word-like answer editor for test papers.
//
// A simplified MS Word-style editing surface: a formatting toolbar above a
// white "page" area, word/character counts, a preview toggle, and a math
// (Sigma) panel that inserts real rendered equations. Equations are written
// in LaTeX and rendered live with KaTeX, so a student can write and solve
// a maths problem step by step inside the answer itself. The value stored
// is HTML (sanitized again on display by PaperSafeHtml); plain-text length
// is what counts against maxChars, exactly like the old textarea limit.
import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import SafeHtml, { stripHtmlToText } from './PaperSafeHtml';

const MATH_PRESETS = [
  { label: 'a⁄b', tex: '\\frac{a}{b}' },
  { label: 'x²', tex: 'x^2' },
  { label: '√x', tex: '\\sqrt{x}' },
  { label: 'θ', tex: '\\theta' },
  { label: 'π', tex: '\\pi' },
  { label: '∑', tex: '\\sum_{i=1}^{n} x_i' },
  { label: '∫', tex: '\\int_a^b f(x)\\,dx' },
  { label: '±', tex: '\\pm' },
];

function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export default function PaperAnswerEditor({
  value, onChange, maxChars, minHeight, placeholder,
}) {
  const editorRef = useRef(null);
  const lastGoodRef = useRef(value || '');
  const composingRef = useRef(false);
  const [html, setHtml] = useState(value || '');
  const [textLen, setTextLen] = useState(() => stripHtmlToText(value || '').trim().length);
  const [showMath, setShowMath] = useState(false);
  const [mathTex, setMathTex] = useState('');
  const [mathError, setMathError] = useState('');
  const [preview, setPreview] = useState(false);

  // Mount only: the parent remounts this editor per question (key), so the
  // initial value is the stored answer for that question.
  useEffect(() => {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = value || '';
      lastGoodRef.current = value || '';
      setHtml(value || '');
      setTextLen(stripHtmlToText(value || '').trim().length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (nextHtml) => {
    setHtml(nextHtml);
    const text = stripHtmlToText(nextHtml).trim();
    setTextLen(text.length);
    onChange(nextHtml, text);
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    if (composingRef.current) {
      emit(el.innerHTML);
      return;
    }
    const text = stripHtmlToText(el.innerHTML).trim();
    if (text.length > maxChars) {
      el.innerHTML = lastGoodRef.current;
      placeCaretAtEnd(el);
      emit(el.innerHTML);
      return;
    }
    lastGoodRef.current = el.innerHTML;
    emit(el.innerHTML);
  };

  const handleBlur = () => {
    const el = editorRef.current;
    if (el && !stripHtmlToText(el.innerHTML).trim()) {
      el.innerHTML = '';
      lastGoodRef.current = '';
      emit('');
    }
  };

  const exec = (cmd, arg = null) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand(cmd, false, arg);
    } catch (_) {
      // Formatting is best-effort; typing still works.
    }
    handleInput();
  };

  const clearAll = () => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = '';
    lastGoodRef.current = '';
    el.focus();
    emit('');
  };

  const insertMath = () => {
    const tex = mathTex.trim();
    if (!tex) return;
    let rendered = '';
    try {
      rendered = katex.renderToString(tex, { throwOnError: false });
      setMathError('');
    } catch (_) {
      setMathError('Equation theek nahi bani — LaTeX dobara check karein.');
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const esc = tex
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    try {
      document.execCommand(
        'insertHTML',
        false,
        `<span class="edx-math" data-tex="${esc}">${rendered}</span>&nbsp;`,
      );
    } catch (_) {
      return;
    }
    setMathTex('');
    setShowMath(false);
    handleInput();
  };

  const mathPreview = (() => {
    if (!mathTex.trim()) return '';
    try {
      return katex.renderToString(mathTex, { throwOnError: false });
    } catch (_) {
      return '';
    }
  })();

  const words = html ? stripHtmlToText(html).trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="edx-word-editor">
      <div className="edx-word-toolbar" role="toolbar" aria-label="Answer formatting">
        <button type="button" title="Bold" aria-label="Bold" onClick={() => exec('bold')}><b>B</b></button>
        <button type="button" title="Italic" aria-label="Italic" onClick={() => exec('italic')}><i>I</i></button>
        <button type="button" title="Underline" aria-label="Underline" onClick={() => exec('underline')}><u>U</u></button>
        <button type="button" title="Heading" aria-label="Heading" onClick={() => exec('formatBlock', 'h3')}>H</button>
        <span className="edx-word-sep" />
        <button type="button" title="Bullet list" aria-label="Bullet list" onClick={() => exec('insertUnorderedList')}>• List</button>
        <button type="button" title="Numbered list" aria-label="Numbered list" onClick={() => exec('insertOrderedList')}>1. List</button>
        <span className="edx-word-sep" />
        <button type="button" title="Subscript" aria-label="Subscript" onClick={() => exec('subscript')}>x₂</button>
        <button type="button" title="Superscript" aria-label="Superscript" onClick={() => exec('superscript')}>x²</button>
        <button type="button" title="Insert equation" aria-label="Insert equation" className={showMath ? 'active' : ''} onClick={() => setShowMath((s) => !s)}>Σ Equation</button>
        <span className="edx-word-sep" />
        <button type="button" title="Clear formatting" aria-label="Clear formatting" onClick={() => { exec('removeFormat'); exec('formatBlock', 'p'); }}>Clear</button>
        <button type="button" title="Preview answer" aria-label="Preview answer" className={preview ? 'active' : ''} onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</button>
        <button type="button" title="Clear answer" aria-label="Clear answer" onClick={clearAll}>Erase</button>
      </div>
      {showMath && (
        <div className="edx-word-math">
          <label>Equation (LaTeX)
            <input
              type="text"
              value={mathTex}
              onChange={(e) => setMathTex(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertMath(); } }}
              placeholder="e.g. \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
            />
          </label>
          <div className="edx-word-math-presets">
            {MATH_PRESETS.map((p) => (
              <button key={p.tex} type="button" onClick={() => setMathTex(p.tex)}>{p.label}</button>
            ))}
          </div>
          {mathPreview && <div className="edx-word-math-preview" dangerouslySetInnerHTML={{ __html: mathPreview }} />}
          {mathError && <p role="alert" className="edx-exam-alert">{mathError}</p>}
          <div className="edx-exam-actions">
            <button type="button" className="edx-exam-primary" onClick={insertMath} disabled={!mathTex.trim()}>Insert equation</button>
            <button type="button" className="edx-exam-secondary" onClick={() => setShowMath(false)}>Close</button>
          </div>
        </div>
      )}
      <div
        className={'edx-word-page' + (preview ? ' hidden' : '')}
        style={{ minHeight: minHeight || 160 }}
      >
        <div
          ref={editorRef}
          className="edx-word-editable"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder || 'Type your answer here…'}
          onInput={handleInput}
          onBlur={handleBlur}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; handleInput(); }}
        />
      </div>
      {preview && (
        <div className="edx-word-preview">
          {html && stripHtmlToText(html).trim()
            ? <SafeHtml html={html} />
            : <p className="edx-paper-note">Abhi koi jawab nahi likha.</p>}
        </div>
      )}
      <div className="edx-word-count">
        <span>{words} words</span>
        <span>{textLen} / {maxChars} characters</span>
      </div>
    </div>
  );
}
