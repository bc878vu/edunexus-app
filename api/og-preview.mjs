// OG preview endpoint for shared file preview links.
// Problem: preview links like /?page=academic&subject=X&file=ID&panel=preview are
// client-side SPA URLs. WhatsApp/Facebook/Twitter crawlers do NOT execute
// JavaScript, so they only see the generic index.html OG tags.
// Fix: a Vercel rewrite sends crawler user-agents (with ?file= present) here,
// and this endpoint returns server-rendered HTML with the file's real title,
// description and image as OG tags. Regular browsers never hit this route.
import { escapeHtml as h, getPublicFile, validId, SITE } from './resource-data.mjs';

// In-memory cache: survives Firestore quota outages so shared links keep
// showing the right preview even when the backend is throttled.
const ogCache = new Map(); // key -> { html, at }
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_CACHE = 300;
function cacheGet(key) {
  const e = ogCache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) { ogCache.delete(key); return null; }
  return e.html;
}
function cacheSet(key, html) {
  if (ogCache.size >= MAX_CACHE) { const k = ogCache.keys().next().value; ogCache.delete(k); }
  ogCache.set(key, { html, at: Date.now() });
}

function fallbackHtml(appUrl) {
  // Generic tags when the file lookup fails (e.g. quota outage). Still better
  // than nothing; noindex so search engines don't index the fallback.
  const title = 'Study Resource | EduNexus';
  const desc = 'Preview and download this study resource in the EduNexus Academic Hub.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><meta name="robots" content="noindex,follow"><meta property="og:type" content="website"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(desc)}"><meta property="og:url" content="${h(appUrl)}"><meta property="og:image" content="${h(SITE + '/logo512.png')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(desc)}"><meta name="twitter:image" content="${h(SITE + '/logo512.png')}"><meta http-equiv="refresh" content="0;url=${h(appUrl)}"></head><body><p><a href="${h(appUrl)}">Open in EduNexus</a></p></body></html>`;
}

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  const id = String(req.query?.file || '');
  if (!validId(id)) return res.status(404).send('Resource not found');

  // Rebuild the exact app URL the user shared (preserve subject/panel params).
  const page = String(req.query?.page || 'academic');
  const subject = String(req.query?.subject || '');
  const panel = String(req.query?.panel || 'preview');
  let appUrl = SITE + '/?page=' + encodeURIComponent(page);
  if (subject) appUrl += '&subject=' + encodeURIComponent(subject);
  appUrl += '&file=' + encodeURIComponent(id);
  if (panel) appUrl += '&panel=' + encodeURIComponent(panel);

  const cached = cacheGet(id);
  if (cached) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(cached);
  }

  let file = null;
  try {
    file = await getPublicFile(id);
  } catch (error) {
    console.error('OG preview lookup failed', error?.message || 'unknown');
  }
  if (!file) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml(appUrl));
  }

  const name = String(file.name || file.title || 'Study resource').slice(0, 180);
  const subjectName = String(file.subject || subject || 'General').slice(0, 120);
  const description = String(file.description || '').trim().slice(0, 3500);
  const summary = description || ('Preview and download ' + name + ' for ' + subjectName + ' in the EduNexus Academic Hub.');
  const title = name + ' | ' + subjectName + (name.toLowerCase().includes('edunexus') ? '' : ' | EduNexus');
  const descShort = summary.slice(0, 190);

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><meta name="description" content="${h(descShort)}"><meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(descShort)}"><meta property="og:url" content="${h(appUrl)}"><meta property="og:image" content="${h(SITE + '/logo512.png')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(descShort)}"><meta name="twitter:image" content="${h(SITE + '/logo512.png')}"><meta http-equiv="refresh" content="0;url=${h(appUrl)}"></head><body><p><a href="${h(appUrl)}">${h(title)}</a></p></body></html>`;

  cacheSet(id, html);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
}
