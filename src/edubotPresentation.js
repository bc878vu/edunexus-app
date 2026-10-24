import { EDUNEXUS_SITE } from './edubotKnowledge';

// The provider may reply with Markdown even when instructed otherwise. Render
// readable plain text, never unsafe raw HTML or Markdown.
export function cleanEduBotText(raw) {
  const source = String(raw || '').slice(0, 4500);
  const normalized = source
    .replace(/\[([^\]\n]{1,180})\]\((https:\/\/[^)\s]+)\)/g, (_, label, url) => label + '\n' + url)
    .replace(/(?:^|\n)\s*#{1,4}\s*/g, '\n')
    .replace(/\*\*|__|(?<!\w)\*(?!\w)|(?<!\w)_(?!\w)/g, '')
    .replace(/(^|\n)\s*>\s?/g, '$1')
    .replace(/(^|\n)\s*[-•]\s+/g, '$1')
    .replace(/(^|\n)\s*\d{1,2}[.)]\s+/g, '$1');
  const lines = normalized.split('\n');
  return lines.filter((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || i === 0) return true;
    const previous = lines[i - 1].trim();
    return !(trimmed.startsWith('https://') && trimmed === previous);
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
export function renderableLinks(text, approvedUrls = []) {
  const known = new Set(approvedUrls.map(s => normalizePublicUrl(s)).filter(Boolean));
  // WhatsApp direct-chat links: the AI may encode the prefilled message
  // differently, so wa.me links match by host + path, ignoring the query.
  // Drive/Supabase file links still need an exact match (their IDs matter).
  const waBases = new Set([...known].map(u => { try { const x = new URL(u); return x.hostname === 'wa.me' ? x.origin + x.pathname : ''; } catch (_) { return ''; } }).filter(Boolean));
  const isApproved = (normalized) => {
    if (known.has(normalized)) return true;
    try { const u = new URL(normalized); return waBases.has(u.origin + u.pathname); } catch (_) { return false; }
  };
  // Unknown or made-up AI URLs remain plain text, not clickable endorsements.
  const chunks = [];
  const re = /https:\/\/[^\s<>"'\]\[()]+/g;
  let pos = 0, match;
  while ((match = re.exec(text || ''))) {
    if (match.index > pos) chunks.push({ text: text.slice(pos, match.index) });
    const raw = match[0], url = raw.replace(/[.,;:!?]+$/, '');
    const tail = raw.slice(url.length);
    const normalized = normalizePublicUrl(url);
    if (isApproved(normalized)) chunks.push({ text: url, url: normalized });
    else {
      // Unverified URLs vanish silently — never show a placeholder line.
      // Trim a dangling colon left behind (e.g. "file bhi hai: <dropped url>").
      const prev = chunks[chunks.length - 1];
      if (prev && !prev.url) prev.text = prev.text.replace(/:\s*$/, '');
    }
    if (tail) chunks.push({ text: tail });
    pos = match.index + raw.length;
  }
  if (pos < (text || '').length) chunks.push({ text: text.slice(pos) });
  return chunks.length ? chunks : [{ text: String(text || '') }];
}
export function normalizePublicUrl(value) {
  try {
    const u = new URL(String(value || ''), EDUNEXUS_SITE);
    return u.protocol === 'https:' ? u.href : '';
  } catch (_) { return ''; }
}
export function plainSpeechText(raw) {
  return cleanEduBotText(raw).replace(/https:\/\/\S+/g, ' Link available in chat. ').slice(0, 2500);
}
