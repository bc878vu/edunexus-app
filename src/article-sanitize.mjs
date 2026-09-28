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
  return s.trim();
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
