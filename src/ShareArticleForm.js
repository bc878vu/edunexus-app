import React, { useState } from 'react';
import { createArticle } from './db/articles';
import { scanArticleContent } from './article-scan.mjs';

// Public "Share your article" form (sign-in-free, like the rest of the site).
// Flow (user-approved 2026-10-28): scan first, then upload.
//   clean  => published immediately (Active)
//   flagged => saved unpublished, shown to the admin approval queue
// The cover is an image URL for now: guests have no signed-upload token,
// so a pasted image link is used; the admin may attach a cover on approval.
// Inline pictures: a line that is only an image URL becomes an <img> in
// the body (the sanitizer only allows https src + alt).
// Tables: rows written as "cell | cell | cell" in the table box become a
// real <table> (first row = header). The sanitizer allows table tags.

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const linkify = (s) =>
  escapeHtml(s).replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const clean = url.replace(/[.,;:!?)\]]+$/, '');
    const trail = url.slice(clean.length);
    return '<a href="' + clean + '">' + clean + '</a>' + trail;
  });

const IMG_URL_RE = /^https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif)(\?\S*)?$/i;

function bodyTextToHtml(text, tableText) {
  const blocks = String(text || '').split(/\n\s*\n/);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && IMG_URL_RE.test(lines[0])) {
      out.push('<p><img src="' + escapeHtml(lines[0]) + '" alt="Article image"></p>');
    } else if (lines.every((l) => /^[-*•]\s+/.test(l))) {
      out.push('<ul>' + lines.map((l) => '<li>' + linkify(l.replace(/^[-*•]\s+/, '')) + '</li>').join('') + '</ul>');
    } else {
      out.push('<p>' + lines.map(linkify).join('<br>') + '</p>');
    }
  }
  const rows = String(tableText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'))
    .map((l) => l.split('|').map((c) => c.trim()).filter((c) => c !== ''));
  if (rows.length) {
    const [head, ...rest] = rows;
    out.push(
      '<table><thead><tr>' + head.map((c) => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rest.map((r) => '<tr>' + r.map((c) => '<td>' + escapeHtml(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
    );
  }
  return out.join('\n');
}

export default function ShareArticleForm({ theme, showToast }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tableText, setTableText] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [sending, setSending] = useState(false);

  const inputCls = `w-full ${theme.input} p-2.5 rounded-lg mb-3`;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !title.trim() || !body.trim()) {
      showToast('Please fill name, email, title and article text', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setSending(true);
    try {
      const html = bodyTextToHtml(body, tableText);
      const scan = scanArticleContent({ title, body, imageName: coverUrl });
      const clean = scan.status === 'clean';
      const extra = {
        moderation_status: clean ? 'published' : 'pending',
        submitted_by: {
          name: name.trim(),
          email: email.trim(),
          contact: contact.trim(),
          submitted_at: new Date().toISOString(),
        },
        scan: { status: scan.status, categories: scan.categories },
      };
      await createArticle({
        title: title.trim(),
        content: html,
        imageUrl: coverUrl.trim() || undefined,
        author: name.trim(),
        isActive: clean,
        extra,
      });
      if (clean) {
        showToast('Your article is published!', 'success');
      } else {
        showToast('Your article was sent for admin approval and will appear after review.', 'info');
      }
      setName(''); setEmail(''); setContact(''); setTitle('');
      setBody(''); setTableText(''); setCoverUrl(''); setOpen(false);
    } catch (e) {
      showToast('Could not submit your article. Please try again.', 'error');
    }
    setSending(false);
  };

  return (
    <div className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-4 font-bold"
      >
        {open ? 'Close sharing form ▲' : '✍️ Share your own article with EduNexus ▼'}
      </button>
      {open && (
        <div className="px-6 pb-6">
          <p className={`text-sm ${theme.textMuted} mb-4`}>
            Anyone can share an article. Every article is scanned before publishing:
            clean articles publish immediately, flagged ones go to admin approval.
            No Islamophobic, sexual, political, anti-country, anti-army or
            personal-attack content is published.
          </p>
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Your full name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Khan" className={inputCls} />
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Email *</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>WhatsApp / contact (optional)</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="03xx-xxxxxxx" className={inputCls} />
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Article title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" className={inputCls} />
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Article text * (links pasted as URLs become coloured clickable links; a line that is only an image URL becomes a picture)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your article here..." rows={10} className={inputCls} />
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Table (optional — one row per line, cells separated by | ; first row is the header)</label>
          <textarea value={tableText} onChange={(e) => setTableText(e.target.value)} placeholder={'Name | Marks | Grade\nAhmed | 85 | A'} rows={3} className={inputCls} />
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Cover image URL (optional)</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://.../cover.jpg" className={inputCls} />
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {sending ? 'Submitting…' : 'Submit article'}
          </button>
        </div>
      )}
    </div>
  );
}
