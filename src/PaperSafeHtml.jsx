// src/PaperSafeHtml.jsx — safe rendering for student-written answers.
//
// Subjective answers are stored as HTML (from the Word-like editor) or as
// plain text (older attempts). This renderer sanitizes both: only a small
// allowlist of formatting tags survives, scripts/iframes/event handlers are
// stripped, and math spans (data-tex) are re-rendered with KaTeX so equations
// display correctly in results and in the teacher's review view.
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's',
  'ul', 'ol', 'li', 'h3', 'h4', 'sub', 'sup', 'span',
]);

export function stripHtmlToText(html) {
  if (!html) return '';
  if (html.indexOf('<') === -1) return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || '').replace(/\u00a0/g, ' ');
}

const DROP_ENTIRELY = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input',
  'button', 'link', 'meta', 'title', 'textarea', 'select', 'audio', 'video',
]);

function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 8) {
        child.remove();
        return;
      }
      if (child.nodeType !== 1) return;
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        if (DROP_ENTIRELY.has(tag)) {
          child.remove();
        } else {
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          node.replaceChild(frag, child);
          walk(frag);
        }
        return;
      }
      Array.from(child.attributes || []).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name === 'class' && tag === 'span') return;
        if (name === 'data-tex' && tag === 'span' && child.classList.contains('edx-math')) return;
        child.removeAttribute(attr.name);
      });
      walk(child);
    });
  };
  walk(tpl.content);
  tpl.content.querySelectorAll('span.edx-math[data-tex]').forEach((span) => {
    try {
      span.innerHTML = katex.renderToString(span.getAttribute('data-tex') || '', { throwOnError: false });
    } catch (_) {
      // Keep the stored rendering if re-rendering fails.
    }
  });
  return tpl.innerHTML;
}

function plainToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export default function SafeHtml({ html, className }) {
  const safe = React.useMemo(() => {
    if (!html) return '';
    if (html.indexOf('<') === -1) return plainToHtml(html);
    try {
      return sanitize(html);
    } catch (_) {
      return plainToHtml(html);
    }
  }, [html]);
  if (!safe) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
