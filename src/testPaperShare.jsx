// src/testPaperShare.jsx — Share links for test papers (student side).
//
// Two link shapes, both resolve on a fresh load with no prior state:
//   1. Saved fixed paper:  /test-papers?saved=<record id>  (built from the
//      Supabase test_paper_records id — never hand-typed, so the id is exact).
//   2. Pattern paper:      /test-papers?subject=CODE&term=Finalterm&lectures=1,3
//      &mcqs=20&shorts=3&longs=3  (stateless; the term is ALWAYS included —
//      without it a Finalterm paper rebuilds as Midterm on subjects that
//      have both banks, because the pattern parser falls back to the first
//      bank for the code).
//
// Share uses the Web Share API where the device supports it (mobile share
// sheet) and falls back to copying the link to the clipboard.

import React, { useState } from 'react';

export function savedPaperUrl(id) {
  return window.location.origin + '/test-papers?saved=' + encodeURIComponent(id);
}

export function patternUrl({ subject, term, lectures, mcq = 20, short = 3, long = 3 }) {
  const params = new URLSearchParams({
    subject: String(subject || '').toUpperCase(),
    lectures: (lectures || []).join(','),
    mcqs: String(mcq),
    shorts: String(short),
    longs: String(long),
  });
  if (term) params.set('term', term);
  return window.location.origin + '/test-papers?' + params.toString();
}

// The shareable URL for any paper object the runner/builder produces:
// saved papers use their record id, custom (builder/pattern) papers use
// their pattern params + term, registry papers use their slug.
export function paperShareUrl(paper) {
  if (!paper) return '';
  if (paper.savedId) return savedPaperUrl(paper.savedId);
  if (paper.isCustom && paper.patternParams) {
    return patternUrl({ ...paper.patternParams, term: paper.term });
  }
  if (paper.slug && !String(paper.slug).startsWith('builder:')) {
    return window.location.origin + '/test-papers/' + paper.slug;
  }
  return '';
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // Clipboard API unavailable (older browsers / insecure context):
    // select-and-copy via a temporary textarea.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }
}

// Returns 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareLink({ title, text, url }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // Share failed (e.g. unsupported payload) — fall through to copy.
    }
  }
  const ok = await copyText(url);
  return ok ? 'copied' : 'failed';
}

// Copy link + Share buttons for one paper. `url` must already be built with
// savedPaperUrl / patternUrl / paperShareUrl — never hand-typed.
export function PaperShareButtons({ url, title }) {
  const [state, setState] = useState(''); // '' | 'copied' | 'shared' | 'failed'
  const [timer, setTimer] = useState(null);
  const flash = (next) => {
    setState(next);
    if (timer) window.clearTimeout(timer);
    setTimer(window.setTimeout(() => setState(''), 2500));
  };
  const onCopy = async () => {
    const ok = await copyText(url);
    flash(ok ? 'copied' : 'failed');
  };
  const onShare = async () => {
    const result = await shareLink({
      title: title || 'EduNexus Test Paper',
      text: (title || 'Test Paper') + ' — EduNexus',
      url,
    });
    if (result === 'cancelled') return;
    flash(result === 'shared' ? 'shared' : result === 'copied' ? 'copied' : 'failed');
  };
  if (!url) return null;
  return (
    <span className="edx-paper-share-row">
      <button type="button" className="edx-exam-secondary" onClick={onCopy}>
        {state === 'copied' ? 'Copied!' : 'Copy link'}
      </button>
      <button type="button" className="edx-exam-secondary" onClick={onShare}>
        {state === 'shared' ? 'Shared!' : 'Share'}
      </button>
      {state === 'failed' && (
        <span role="alert" className="edx-paper-share-failed">Copy failed — select the link and copy it.</span>
      )}
    </span>
  );
}
