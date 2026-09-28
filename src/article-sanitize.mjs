// Shared sanitizer for article HTML bodies (client + server).
//
// Root cause it fixes: the admin editor is contentEditable and stores
// innerHTML (real <h2>/<p>/<ul>/<strong> tags), but no display path ever
// rendered that HTML — RichContent treats everything as text and the
// server page HTML-escaped it. Result: literal "<h2>" tags visible to readers.
//
// This keeps a safe formatting subset (headings, paragraphs, lists, bold,
// italic, links) so articles render properly, while stripping everything
// dangerous (scripts, iframes, event handlers, javascript: URLs, ...).
// It also tolerates bodies that were stored entity-encoded ("&lt;h2&gt;").

const ALLOWED_TAGS = new Set([
  'h2', 'h3', 'h4',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u',
  'blockquote', 'div', 'span', 'a',
]);

// Unwrap headings that wrongly wrap whole blocks — a paste artifact from the
// contentEditable admin editor (e.g. <h2><p>...</p></h2>), which renders
// entire paragraphs/lists bold. Real headings (<h2>text</h2>) are untouched.
// Exported so the admin editor can clean pasted/saved content too.
export function unwrapNestedHeadings(input) {
  return String(input ?? '').replace(/<(h2|h3|h4)>((?:\s*<(p|ul|ol|div|blockquote)\b[\s\S]*?<\/\3\s*>)+)\s*<\/\1\s*>/gi, '$2');
}
const DANGEROUS_BLOCK = /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta|base|noscript|template|frame|frameset|applet|canvas|svg|math|video|audio|picture)\b[\s\S]*?<\/\1\s*>/gi;
// Stray dangerous tags (self-closed or unclosed).
const DANGEROUS_TAG = /<(script|style|iframe|object|embed|link|meta|base|img|video|audio|source|track|form|input|button|textarea|select|option|canvas|svg)\b[^>]*\/?>/gi;

const BLOCK_CLOSE = /<\/(h2|h3|h4|p|li|ul|ol|div|blockquote|tr|table)>/gi;

function decodeEntitiesOnce(s) {
  return String(s)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function sanitizeArticleHtml(input) {
  let s = String(input ?? '');
  if (!s) return '';
  // Tolerate bodies stored entity-encoded (literal "&lt;h2&gt;" text).
  if (/&lt;\s*\/?\s*[a-z]/i.test(s)) s = decodeEntitiesOnce(s);
  s = unwrapNestedHeadings(s);
  s = s.replace(DANGEROUS_BLOCK, '').replace(DANGEROUS_TAG, '');
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g, (m, tag, attrs) => {
    const t = tag.toLowerCase();
    const isClose = m.charAt(1) === '/';
    if (!ALLOWED_TAGS.has(t)) return '';
    if (isClose) return '</' + t + '>';
    if (t === 'br' || t === 'hr') return '<' + t + '>';
    if (t === 'a') {
      const hm = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || '');
      const href = hm ? (hm[2] ?? hm[3] ?? hm[4] ?? '') : '';
      if (/^(https?:\/\/|\/|#)/i.test(href.trim())) {
        return '<a href="' + escapeAttr(href.trim()) + '">';
      }
      return '<a>';
    }
    return '<' + t + '>';
  });
  // Plain-text bodies (no HTML tags at all): restore the author's line
  // structure as paragraphs, lists, headings, dividers and links, so they
  // don't render as one unbroken wall of text. Bodies that already carry
  // HTML are left untouched.
  if (s.includes('\n') && !/<[a-zA-Z/!]/.test(s)) {
    s = structurePlainText(s);
  }
  return s.trim();
}

// --- Plain-text structuring -----------------------------------------------
// Several articles were stored as plain text (newlines only, no HTML), which
// HTML collapses into a single "raw irregular" wall. This rebuilds a faithful
// structure: blank lines separate paragraphs, single newlines become <br>,
// divider lines become <hr>, list-like lines become real lists, short
// heading-like lines become <h2>, and bare URLs become links.

const DIVIDER_RE = /^[\s\u2501\u2500\-_\u2014*.~#]{4,}$/;
const LIST_NUM_RE = /^\s*\d+\s*(?:[-)\u00BB>]+|\.\s+)\s*(\S[\s\S]*)$/;
const LIST_BUL_RE = /^\s*[\u2022\-*\u2192\u25B6+]\s+(\S[\s\S]*)$/;
const HEADING_STOPWORDS = new Set([
  'of', 'the', 'a', 'an', 'and', 'to', 'in', 'on', 'for', 'vs', 'with',
  'or', 'as', 'at', 'by', 'from', 'is',
]);

function escapeText(s) {
  return String(s)
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function linkifyText(s) {
  return String(s).replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const clean = url.replace(/[.,;:!?)\]]+$/, '');
    const trail = url.slice(clean.length);
    return '<a href="' + clean + '">' + clean + '</a>' + trail;
  });
}

function isListLine(line) {
  return LIST_NUM_RE.test(line) || LIST_BUL_RE.test(line);
}

// Conservative heading detection for plain-text lines. A line becomes <h2>
// only when it is short, has no sentence punctuation/digits/URLs, and is
// either mostly UPPERCASE (e.g. "\uD83C\uDF0B 12:00 AM \u2014 EARTH KA JANAM")
// or Title Case (e.g. "CGPA Calculation Formula").
function looksLikeHeading(line) {
  const t = line.trim();
  if (t.length < 4 || t.length > 70) return false;
  if (!/[A-Za-z\u00C0-\u024F]/.test(t)) return false;
  if (/[.!?]\s*$/.test(t) || /[:,;!?)]\s*$/.test(t)) return false;
  if (/https?:\/\//i.test(t) || /=/.test(t)) return false;
  const letters = t.match(/[A-Za-z\u00C0-\u024F]/g) || [];
  const upper = letters.filter((c) => c !== c.toLowerCase()).length;
  if (letters.length >= 4 && upper / letters.length >= 0.6) return true;
  if (/\d/.test(t) || /[.!?]/.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) return false;
  return words.every((w) => {
    const core = w.replace(/^["'\u201C\u201D\u2018\u2019(\[{]+|["'\u201C\u201D\u2018\u2019)\]}:;,.!?-]+$/g, '');
    if (!core) return true;
    if (HEADING_STOPWORDS.has(core.toLowerCase())) return true;
    return /^[A-Z\u00C0-\u024F]/.test(core);
  });
}

export function structurePlainText(input) {
  const lines = String(input ?? '').split('\n');
  const out = [];
  let para = [];
  let list = null; // { tag: 'ol'|'ul', items: [] }
  const flushPara = () => {
    if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; }
  };
  const flushList = () => {
    if (list) {
      out.push('<' + list.tag + '>' + list.items.map((i) => '<li>' + i + '</li>').join('') + '</' + list.tag + '>');
      list = null;
    }
  };
  const pushListItem = (tag, itemHtml) => {
    flushPara();
    if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
    list.items.push(itemHtml);
  };
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) {
      // Blank line: keep a list open only when the next content line
      // continues it (items are often blank-line separated).
      let nxt = idx + 1;
      while (nxt < lines.length && !lines[nxt].trim()) nxt++;
      flushPara();
      if (nxt >= lines.length || !isListLine(lines[nxt].trim())) flushList();
      continue;
    }
    if (DIVIDER_RE.test(line)) { flushPara(); flushList(); out.push('<hr>'); continue; }
    const lm = line.match(LIST_NUM_RE) || line.match(LIST_BUL_RE);
    if (lm) {
      pushListItem(LIST_NUM_RE.test(line) ? 'ol' : 'ul', linkifyText(escapeText(lm[1].trim())));
      continue;
    }
    if (looksLikeHeading(line)) {
      flushPara(); flushList();
      out.push('<h2>' + linkifyText(escapeText(line)) + '</h2>');
      continue;
    }
    flushList();
    para.push(linkifyText(escapeText(line)));
  }
  flushPara();
  flushList();
  return out.join('');
}

// Plain text version of an article body (tags removed, blocks spaced).
export function articlePlainText(input) {
  let s = sanitizeArticleHtml(input);
  s = s.replace(BLOCK_CLOSE, '$& ').replace(/<br\s*\/?>|<hr\s*\/?>/gi, ' ');
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Short excerpt for cards / meta descriptions.
export function articleExcerpt(input, maxLen = 280) {
  const text = articlePlainText(input);
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.7 ? cut.slice(0, lastSpace) : cut).trim() + '...';
}
