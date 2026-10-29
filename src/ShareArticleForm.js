import React, { useState, useRef } from 'react';
import { createArticle } from './db/articles';
import { supabase } from './db/_common.js';
import { scanArticleContent } from './article-scan.mjs';
import { sanitizeArticleHtml, articlePlainText } from './article-sanitize.mjs';

// Public "Share your article" form (sign-in-free, like the rest of the site).
// Flow (user-approved 2026-10-28) — UNCHANGED:
//   scan first, then upload.
//   clean  => published immediately (Active)
//   flagged => saved unpublished, shown to the admin approval queue
//
// Editor (added 2026-10-28 upgrade): mirrors the ADMIN article box — Title,
// Cover Image URL, a contentEditable rich-text editor with toolbar (font
// family + size, Bold/Italic/Underline/Strike, bullet + numbered lists,
// link, image, clear formatting), a declaration checkbox and Publish.
// Deliberate omissions for guests (spam/abuse vectors, no signed-upload
// token): NO file upload (cover is URL-only) and NO Hidden SEO
// Keywords/Links fields. The admin keeps those; guests never get them.
// Inline pictures: the image button inserts an <img> from a pasted https URL
// (the sanitizer only allows https src + alt).
// Tables: rows written as "cell | cell | cell" in the table box are inserted
// into the editor as a real <table> (first row = header).

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const FONT_SIZE_MAP = { '12': '1', '14': '2', '16': '3', '18': '4', '20': '5', '24': '6', '32': '7' };

function tableTextToHtml(tableText) {
  const rows = String(tableText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'))
    .map((l) => l.split('|').map((c) => c.trim()).filter((c) => c !== ''));
  if (!rows.length) return '';
  const [head, ...rest] = rows;
  return (
    '<table><thead><tr>' + head.map((c) => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr></thead>' +
    '<tbody>' + rest.map((r) => '<tr>' + r.map((c) => '<td>' + escapeHtml(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
  );
}

export default function ShareArticleForm({ theme, showToast }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [title, setTitle] = useState('');
  const [tableText, setTableText] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [guestFile, setGuestFile] = useState(null);
  const [guestFileUrl, setGuestFileUrl] = useState('');
  const guestFileRef = useRef(null);
  const onGuestFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const ext = String(f.name || '').split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || !String(f.type || '').startsWith('image/')) {
      showToast('Please choose a picture file (JPG, PNG, WebP or GIF).', 'error');
      e.target.value = '';
      return;
    }
    if (f.size > 1000000) {
      showToast('Picture must be 1MB or smaller.', 'error');
      e.target.value = '';
      return;
    }
    if (guestFileUrl) { try { URL.revokeObjectURL(guestFileUrl); } catch (_) {} }
    setGuestFile(f);
    setGuestFileUrl(URL.createObjectURL(f));
  };
  const clearGuestFile = () => {
    if (guestFileUrl) { try { URL.revokeObjectURL(guestFileUrl); } catch (_) {} }
    setGuestFile(null); setGuestFileUrl('');
    if (guestFileRef.current) guestFileRef.current.value = '';
  };
  const [declared, setDeclared] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  // Inline link + image boxes (same no-native-prompt pattern as the admin
  // editor: selection is saved when the box opens, restored on apply).
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkHasSelection, setLinkHasSelection] = useState(false);
  const [showImageBox, setShowImageBox] = useState(false);
  const [imageBoxUrl, setImageBoxUrl] = useState('');
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  const inputCls = `w-full ${theme.input} p-2.5 rounded-lg mb-3`;
  const toolbarBtn = 'p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm min-w-[32px] text-center';

  const editorHtml = () => editorRef.current?.innerHTML || '';
  const editorText = () => (editorRef.current?.textContent || '').trim();

  const syncCount = () => {
    const words = editorText().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  };

  const execCmd = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    syncCount();
  };

  // Code block toggle: wraps the current block in <pre> (renders in code
  // font via .edx-article-body pre), or back to a paragraph when already
  // inside one. The article sanitizer keeps pre/code on display.
  const toggleCodeBlock = () => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    let node = sel?.anchorNode;
    let inPre = false;
    while (node && node !== ed) {
      if (node.nodeName === 'PRE') { inPre = true; break; }
      node = node.parentNode;
    }
    execCmd('formatBlock', inPre ? 'p' : 'pre');
  };

  const applyFontFamily = (family) => {
    editorRef.current?.focus();
    document.execCommand('fontName', false, family);
    syncCount();
  };

  const applyFontSize = (size) => {
    editorRef.current?.focus();
    document.execCommand('fontSize', false, FONT_SIZE_MAP[size] || '3');
    // Same normalisation as the admin editor: exact px on a span, so the
    // sanitizer's font-size-only span rule keeps it.
    const fonts = editorRef.current?.querySelectorAll('font[size]');
    fonts?.forEach((f) => {
      const span = document.createElement('span');
      span.style.fontSize = size + 'px';
      span.innerHTML = f.innerHTML;
      f.replaceWith(span);
    });
    syncCount();
  };

  const saveEditorSelection = () => {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current &&
          editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        return true;
      }
    } catch (_) {}
    savedRangeRef.current = null;
    return false;
  };

  const restoreEditorSelection = () => {
    try {
      const range = savedRangeRef.current;
      if (!range) return false;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      editorRef.current?.focus();
      return true;
    } catch (_) { return false; }
  };

  const normaliseUrl = (raw) => {
    let u = String(raw || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  };

  const openLinkBox = () => {
    saveEditorSelection();
    let hasRange = false;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) hasRange = !sel.getRangeAt(0).collapsed;
    } catch (_) {}
    setLinkHasSelection(hasRange);
    setShowImageBox(false);
    setShowLinkBox(true);
  };

  const applyLink = () => {
    const url = normaliseUrl(linkUrl);
    if (!/^https?:\/\//i.test(url)) {
      showToast('Please enter a valid link starting with https://', 'error');
      return;
    }
    restoreEditorSelection();
    if (!linkHasSelection && linkText.trim()) {
      document.execCommand('insertHTML', false, '<a href="' + escapeHtml(url) + '">' + escapeHtml(linkText.trim()) + '</a>');
    } else {
      document.execCommand('createLink', false, url);
    }
    setShowLinkBox(false); setLinkUrl(''); setLinkText(''); syncCount();
  };

  const applyImage = () => {
    const url = normaliseUrl(imageBoxUrl);
    if (!/^https?:\/\//i.test(url)) {
      showToast('Please enter a valid image URL starting with https://', 'error');
      return;
    }
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, '<p><img src="' + escapeHtml(url) + '" alt="Article image"></p>');
    setShowImageBox(false); setImageBoxUrl(''); syncCount();
  };

  const insertTable = () => {
    const html = tableTextToHtml(tableText);
    if (!html) {
      showToast('Write table rows first (cells separated by |)', 'error');
      return;
    }
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    syncCount();
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setWordCount(0); setShowPreview(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !title.trim() || !editorText()) {
      showToast('Please fill name, email, title and article text', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!declared) {
      showToast('Please tick the declaration checkbox to publish', 'error');
      return;
    }
    setSending(true);
    // Visitor network details (admin eyes only, never shown publicly):
    // the article is submitted straight from the browser to Supabase, so the
    // site server never sees the request — resolve IP/city/country via a
    // public lookup, ipapi.co first with ipwho.is as fallback (the live test
    // showed ipapi.co alone can return nothing). Fail-soft: if every lookup
    // fails or times out, the submission still goes through without these
    // fields.
    let visitorNet = {};
    const netProviders = [
      { url: 'https://ipapi.co/json/', pick: (j) => ({ ip: j.ip, city: j.city, country: j.country_name || j.country }) },
      { url: 'https://ipwho.is/', pick: (j) => ({ ip: j.ip, city: j.city, country: j.country }) },
    ];
    for (const p of netProviders) {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 3500);
        const res = await fetch(p.url, { signal: ctl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const j = await res.json();
        const got = p.pick(j) || {};
        if (got.ip) visitorNet.ip = String(got.ip);
        if (got.city) visitorNet.city = String(got.city);
        if (got.country) visitorNet.country = String(got.country);
        if (visitorNet.ip) break;
      } catch (e) { /* try the next provider; submission is never blocked */ }
    }
    try {
      // Direct guest picture upload (needs SUPABASE-guest-upload.sql run once
      // by the admin; until then the upload fails with a clear message and
      // the form keeps its text). Uploaded pictures always go to pending so
      // the admin reviews the image content first.
      let uploadedImageUrl = '';
      if (guestFile) {
        const ext = String(guestFile.name || '').split('.').pop().toLowerCase();
        const uid = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : ('g' + Date.now() + Math.random().toString(36).slice(2));
        const path = 'guest-covers/' + uid + '.' + ext;
        const { error: upErr } = await supabase.storage.from('edunexus-public-files').upload(path, guestFile, { contentType: guestFile.type || undefined, upsert: false });
        if (upErr) throw new Error('UPLOAD_FAILED');
        const { data: pub } = supabase.storage.from('edunexus-public-files').getPublicUrl(path);
        uploadedImageUrl = (pub && pub.publicUrl) || '';
        if (!uploadedImageUrl) throw new Error('UPLOAD_FAILED');
      }
      const html = editorHtml();
      // Scan the plain text (same scan categories + flow as before).
      const scan = scanArticleContent({ title, body: articlePlainText(html), imageName: guestFile ? guestFile.name : coverUrl });
      const clean = scan.status === 'clean';
      const hasUpload = Boolean(uploadedImageUrl);
      const publishedNow = clean && !hasUpload;
      const extra = {
        moderation_status: publishedNow ? 'published' : 'pending',
        submitted_by: {
          name: name.trim(),
          email: email.trim(),
          contact: contact.trim(),
          submitted_at: new Date().toISOString(),
          ...visitorNet,
        },
        scan: { status: scan.status, categories: scan.categories },
      };
      await createArticle({
        title: title.trim(),
        content: html,
        imageUrl: uploadedImageUrl || coverUrl.trim() || undefined,
        author: name.trim(),
        isActive: publishedNow,
        extra,
      });
      if (publishedNow) {
        showToast('Your article is published!', 'success');
      } else if (hasUpload) {
        showToast('Your article was sent for admin approval — uploaded pictures are reviewed by the admin first.', 'info');
      } else {
        showToast('Your article was sent for admin approval and will appear after review.', 'info');
      }
      setName(''); setEmail(''); setContact(''); setTitle('');
      setTableText(''); setCoverUrl(''); setDeclared(false); setOpen(false);
      clearGuestFile();
      clearEditor();
    } catch (e) {
      if (e && e.message === 'UPLOAD_FAILED') {
        showToast('Picture upload needs the guest-upload rule (SUPABASE-guest-upload.sql) — please ask the admin to run it once. Your text is still here.', 'error');
      } else {
        showToast('Could not submit your article. Please try again.', 'error');
      }
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
        <div className="px-4 sm:px-6 pb-6">
          <p className={`text-sm ${theme.textMuted} mb-4`}>
            Anyone can share an article. Every article is scanned before publishing:
            clean articles publish immediately, flagged ones go to admin approval.
            Uploaded pictures are reviewed by the admin first.
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

          {/* Rich-text editor (mirrors the admin article box) */}
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Article text * <span className="font-normal">(rich text editor — like the admin box)</span></label>
          <div className={`border rounded-lg mb-3 overflow-hidden ${theme.border}`}>
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <select onChange={(e) => applyFontFamily(e.target.value)} defaultValue="inherit" className="text-xs p-1 rounded border bg-white dark:bg-slate-700 max-w-[110px]" title="Font family">
                <option value="inherit">Default</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>
              <select onChange={(e) => applyFontSize(e.target.value)} defaultValue="16" className="text-xs p-1 rounded border bg-white dark:bg-slate-700" title="Font size">
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
                <option value="24">24px</option>
                <option value="32">32px</option>
              </select>
              <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('bold')} className={toolbarBtn} title="Bold"><b>B</b></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('italic')} className={toolbarBtn} title="Italic"><i>I</i></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('underline')} className={toolbarBtn} title="Underline"><u>U</u></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('strikeThrough')} className={toolbarBtn} title="Strikethrough"><s>S</s></button>
              <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('insertUnorderedList')} className={toolbarBtn} title="Bullet list">•</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('insertOrderedList')} className={toolbarBtn} title="Numbered list">1.</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={openLinkBox} className={toolbarBtn} title="Insert link">🔗</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('unlink')} className={toolbarBtn} title="Remove link">⛓️‍💥</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setShowLinkBox(false); setShowImageBox(!showImageBox); }} className={toolbarBtn} title="Insert image from URL">🖼️</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={toggleCodeBlock} className={toolbarBtn} title="Code block"><span style={{ fontFamily: 'ui-monospace, monospace' }}>{'{ }'}</span></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('removeFormat')} className={toolbarBtn} title="Clear formatting">✕</button>
            </div>
            {showLinkBox && (
              <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.preventDefault(); setShowLinkBox(false); } }}
                  placeholder="https://example.com"
                  className={`flex-1 min-w-[180px] ${theme.input} p-2 rounded-lg`}
                />
                {!linkHasSelection && (
                  <input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.preventDefault(); setShowLinkBox(false); } }}
                    placeholder="Link text (optional — uses the URL)"
                    className={`flex-1 min-w-[140px] ${theme.input} p-2 rounded-lg`}
                  />
                )}
                <button type="button" onClick={applyLink} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Add link</button>
                <button type="button" onClick={() => setShowLinkBox(false)} className="px-3 py-2 rounded-lg bg-slate-300 dark:bg-slate-600 text-xs font-bold">Cancel</button>
              </div>
            )}
            {showImageBox && (
              <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <input
                  value={imageBoxUrl}
                  onChange={(e) => setImageBoxUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyImage(); } if (e.key === 'Escape') { e.preventDefault(); setShowImageBox(false); } }}
                  placeholder="https://.../picture.jpg"
                  className={`flex-1 min-w-[180px] ${theme.input} p-2 rounded-lg`}
                />
                <button type="button" onClick={applyImage} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Insert picture</button>
                <button type="button" onClick={() => setShowImageBox(false)} className="px-3 py-2 rounded-lg bg-slate-300 dark:bg-slate-600 text-xs font-bold">Cancel</button>
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              onInput={syncCount}
              className={`min-h-[220px] p-3 outline-none ${theme.text} bg-white dark:bg-slate-900 edx-article-body`}
              style={{ fontSize: '15px', lineHeight: '1.6' }}
              data-placeholder="Write your article here... select text and use the toolbar to format it."
              suppressContentEditableWarning
            />
            <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-xs ${theme.textMuted}`}>
              <span>{wordCount} words · ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
              <span className="ml-auto flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowPreview(!showPreview)} className="font-bold text-indigo-500 hover:underline">{showPreview ? 'Hide preview' : 'Preview how it will look'}</button>
                <button type="button" onClick={clearEditor} className="font-bold text-red-500 hover:underline">Clear all</button>
              </span>
            </div>
            {showPreview && (
              <div className={`p-4 border-t border-slate-200 dark:border-slate-700 ${theme.text} edx-article-body`} dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(editorHtml()) }} />
            )}
          </div>

          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Table (optional — one row per line, cells separated by | ; first row is the header)</label>
          <textarea value={tableText} onChange={(e) => setTableText(e.target.value)} placeholder={'Name | Marks | Grade\nAhmed | 85 | A'} rows={3} className={inputCls} />
          <button type="button" onClick={insertTable} className="px-4 py-2 rounded-lg border font-bold text-sm mb-3 hover:bg-slate-100 dark:hover:bg-slate-800">Insert table into article ↑</button>
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Cover image URL (optional)</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://.../cover.jpg" className={inputCls} />
          {coverUrl && /^https?:\/\//i.test(coverUrl.trim()) && (
            <div className="mt-0 mb-3 h-24 w-full overflow-hidden rounded-lg bg-slate-100"><img src={coverUrl.trim()} alt="Cover preview" loading="lazy" className="h-full w-full object-cover opacity-80" /></div>
          )}
          <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Or upload a cover picture (Max 1MB)</label>
          <input ref={guestFileRef} type="file" accept="image/*" onChange={onGuestFile} className="mb-2 text-sm" />
          {guestFileUrl && (
            <div className="mb-3">
              <div className="h-24 w-full overflow-hidden rounded-lg bg-slate-100"><img src={guestFileUrl} alt="Uploaded cover preview" loading="lazy" className="h-full w-full object-cover opacity-80" /></div>
              <p className={`text-xs ${theme.textMuted} mt-1`}>Uploaded picture will be used instead of the URL above.</p>
              <button type="button" onClick={clearGuestFile} className="text-xs font-bold text-red-500 hover:underline mt-1">Remove uploaded picture</button>
            </div>
          )}
          <label className={`flex items-start gap-2 text-sm ${theme.textMuted} mb-4 cursor-pointer`}>
            <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="w-4 h-4 mt-0.5" />
            <span>I confirm this article is my own original writing and I have the right to share it here.</span>
          </label>
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {sending ? 'Submitting…' : 'Submit article'}
          </button>
        </div>
      )}
    </div>
  );
}
