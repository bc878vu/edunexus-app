import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { renderNavbar, navStyles } from './site-shell.mjs';
import { escapeHtml as h, getPublicFile, listPublicFiles, listApprovedReviews, resourcePath, SITE, slugFor, validId } from './resource-data.mjs';
import { guideForFile, SUBJECT_GUIDES } from './subject-guides.mjs';

export const navbar = renderNavbar('academic');
export const styles = `:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color-scheme:light}*{box-sizing:border-box}
body{margin:0;background:#f6f8ff;color:#172036;line-height:1.65}a{color:#4f46e5}
main{max-width:1000px;margin:32px auto;padding:0 20px}
.resource,.reviews{background:white;border:1px solid #dce1f0;border-radius:20px;padding:clamp(20px,4vw,38px);box-shadow:0 12px 30px -24px #253366}
h1{font-size:clamp(1.55rem,3.1vw,2.25rem);line-height:1.28;overflow-wrap:anywhere}h2{font-size:1.35rem}
p{white-space:pre-wrap;overflow-wrap:anywhere}.meta{color:#4f46e5;font-size:.9rem;font-weight:750}
.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:25px 0}.button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;background:#4f46e5;color:white;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:750}
.button:hover{filter:brightness(.93)}.button.secondary{background:#25314e}
.reviews{margin-top:22px}.review{border-top:1px solid #e5e7f0;padding:18px 0}
.review-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.stars{color:#b45309;letter-spacing:1px;font-weight:850}.review p{white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0}
.pager{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin:18px 0}.pager a{font-weight:750}
.site-footer{max-width:1000px;margin:25px auto 40px;padding:0 20px;color:#56627b;font-size:.9rem}
.site-footer nav{display:flex;flex-wrap:wrap;gap:14px}.site-footer a{color:#334155}
a:focus-visible,summary:focus-visible{outline:3px solid #818cf8;outline-offset:3px}
@media(max-width:1250px){.desktop-links{display:none}.mobile-menu{display:block}}
@media(max-width:480px){.resource,.reviews{padding:18px}main{margin-top:17px;padding:0 12px}}
${navStyles}`;
const validReviewPage = (raw) => {
  if (raw == null || raw === '') return 1;
  if (!/^[1-9][0-9]{0,3}$/.test(String(raw))) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n <= 1000 ? n : null;
};
function linkToPage(path, page) { return path + (page > 1 ? '?reviews=' + page : ''); }

// In-memory cache: survives Firestore quota outages so shared resource links keep working.
const pageCache = new Map(); // key -> { html, at }
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_CACHE = 200;
function cacheGet(key) {
  const e = pageCache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) { pageCache.delete(key); return null; }
  return e.html;
}
function cacheSet(key, html) {
  if (pageCache.size >= MAX_CACHE) { const k = pageCache.keys().next().value; pageCache.delete(k); }
  pageCache.set(key, { html, at: Date.now() });
}
function fallbackPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Study Resource | EduNexus</title><meta name="description" content="Open this study resource in the EduNexus Academic Hub."><meta property="og:type" content="website"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="Study Resource | EduNexus"><meta property="og:description" content="Open this study resource in the EduNexus Academic Hub."><meta property="og:image" content="${h(SITE + '/logo512.png')}"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="noindex,follow"><style>${styles}</style></head><body>${navbar}<main><article class="resource"><div class="meta">EduNexus · Academic Hub</div><h1>Study Resource</h1><p>This resource page is temporarily unavailable. Please try again in a little while, or open it directly in the Academic Hub.</p><div class="buttons"><a class="button" href="/?page=academic">Open Academic Hub</a><a class="button secondary" href="/">Back to home</a></div></article></main><footer class="site-footer"><p>© EduNexus · Independent student study resources</p></footer></body></html>`;
}
function buildSchema({ name, subject, summary, canonical }) {
  // A downloadable PDF page is a LearningResource, not necessarily a Course,
  // Book, Product or other Google review-rich-result eligible entity. Google
  // treats Review/AggregateRating nested on LearningResource as an invalid
  // parent type. Do not turn files into fictitious Products or Courses to
  // obtain stars. Student feedback and ratings remain visible in page HTML
  // and in the Academic Hub; only ineligible review JSON-LD is omitted.
  // Review authors are not captured as public, verified names; do not invent
  // author data for a markup-only workaround.
  const schema = {
    '@context': 'https://schema.org', '@type': 'LearningResource',
    name, description: summary, url: canonical, educationalUse: 'revision',
    learningResourceType: 'study material', about: subject, inLanguage: 'en',
    isAccessibleForFree: true,
    provider: { '@type': 'Organization', name: 'EduNexus', url: SITE }
  };
  return JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
function compactSharedFallback(req, id) {
  const raw = String(req.query?.p || '');
  if (!raw || raw.length > 1200 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - raw.length % 4) % 4);
    const [nameRaw, subjectRaw, descRaw] = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
    const name = clean(nameRaw, 180);
    if (!name) return null;
    return { id, name, title: name, subject: clean(subjectRaw, 120) || 'General',
      description: clean(descRaw, 500), ext: 'Study file', isActive: true };
  } catch (_) { return null; }
}
function sharedFallback(req, id) {
  if (String(req.query?.share || '') !== '1') return null;
  const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
  const name = clean(req.query?.t, 180);
  if (!name) return null;
  return { id, name, title: name, subject: clean(req.query?.s, 120) || 'General',
    description: clean(req.query?.d, 500), ext: 'Study file', isActive: true };
}
function sharedPreviewHtml(req, file) {
  const id = String(file.id || req.query?.id || '');
  const name = String(file.name || file.title || 'Study resource').slice(0, 180);
  const subject = String(file.subject || 'General').slice(0, 120);
  const description = String(file.description || '').trim();
  const summary = description || ('Preview ' + name + ' for ' + subject + ' in the EduNexus Academic Hub.');
  const title = name + (name.toLowerCase().includes('edunexus') ? '' : ' | EduNexus');
  const appUrl = SITE + '/?page=academic&subject=' + encodeURIComponent(subject) + '&file=' + encodeURIComponent(id) + '&panel=preview';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + h(title) + '</title><meta name="description" content="' + h(summary.slice(0,190)) + '">' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus">' +
    '<meta property="og:title" content="' + h(title) + '"><meta property="og:description" content="' + h(summary.slice(0,190)) + '">' +
    '<meta property="og:url" content="' + h(SITE + req.url) + '"><meta property="og:image" content="' + h(SITE + '/logo512.png') + '">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + h(title) + '">' +
    '<meta name="twitter:description" content="' + h(summary.slice(0,190)) + '"><meta name="twitter:image" content="' + h(SITE + '/logo512.png') + '">' +
    '<meta http-equiv="refresh" content="0;url=' + h(appUrl) + '"></head><body><p><a href="' + h(appUrl) + '">' + h(name) + '</a></p></body></html>';
}
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  const id = String(req.query?.id || req.query?.file || '');
  const reviewPage = validReviewPage(req.query?.reviews);
  if (!validId(id) || reviewPage === null) return res.status(404).send('Resource not found');
  // OG-preview fast path: serve from cache before touching Firestore, so shared
  // links keep correct previews during quota outages.
  if (req.query?.ogpreview) {
    const cachedOg = cacheGet(id + ':ogpreview');
    if (cachedOg) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (req.method === 'HEAD') return res.status(200).end();
      return res.status(200).send(cachedOg);
    }
  }
  try {
    // Compact share links are self-contained. Decode them before any Firestore
    // read so WhatsApp preview generation does not consume quota or fail on 503.
    let file = compactSharedFallback(req, id);
    const compactShare = Boolean(file);
    if (!file) {
      try { file = await getPublicFile(id); } catch (lookupError) {
        file = sharedFallback(req, id);
        if (!file) throw lookupError;
      }
      if (!file) file = sharedFallback(req, id);
    }
    if (!file) return res.status(404).send('Resource not found');
    if (compactShare || String(req.query?.share || '') === '1') {
      const html = sharedPreviewHtml(req, file);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      if (req.method === 'HEAD') return res.status(200).end();
      return res.status(200).send(html);
    }
    const name = String(file.name || file.title || 'Study resource').slice(0, 180);
    const subject = String(file.subject || 'General').slice(0, 120);
    const description = String(file.description || '').trim().slice(0, 3500);
    const path = resourcePath(id, name);
    // Compact OG response for shared preview links (?page=academic&file=ID&panel=preview).
    // Served to WhatsApp/Facebook/Twitter crawlers via the vercel.json rewrite —
    // crawlers don't run JS, so the SPA's index.html would only show generic tags.
    // Folded into this existing function to stay under the Hobby-plan function limit.
    if (req.query?.ogpreview) {
      const ogCacheKey = id + ':ogpreview';
      const buildOgHtml = () => {
        const ogPage = String(req.query?.page || 'academic');
        const ogSubject = String(req.query?.subject || '');
        const ogPanel = String(req.query?.panel || 'preview');
        let ogAppUrl = SITE + '/?page=' + encodeURIComponent(ogPage);
        if (ogSubject) ogAppUrl += '&subject=' + encodeURIComponent(ogSubject);
        ogAppUrl += '&file=' + encodeURIComponent(id);
        if (ogPanel) ogAppUrl += '&panel=' + encodeURIComponent(ogPanel);
        const ogSummary = description || ('Preview and download ' + name + ' for ' + subject + ' in the EduNexus Academic Hub.');
        const ogTitle = name + ' | ' + subject + (name.toLowerCase().includes('edunexus') ? '' : ' | EduNexus');
        const ogDesc = ogSummary.slice(0, 190);
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>' + h(ogTitle) + '</title><meta name="description" content="' + h(ogDesc) + '">' +
          '<meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus">' +
          '<meta property="og:title" content="' + h(ogTitle) + '"><meta property="og:description" content="' + h(ogDesc) + '">' +
          '<meta property="og:url" content="' + h(ogAppUrl) + '"><meta property="og:image" content="' + h(SITE + '/logo512.png') + '">' +
          '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + h(ogTitle) + '">' +
          '<meta name="twitter:description" content="' + h(ogDesc) + '"><meta name="twitter:image" content="' + h(SITE + '/logo512.png') + '">' +
          '<meta http-equiv="refresh" content="0;url=' + h(ogAppUrl) + '"></head>' +
          '<body><p><a href="' + h(ogAppUrl) + '">' + h(ogTitle) + '</a></p></body></html>';
      };
      try {
        const ogHtml = buildOgHtml();
        cacheSet(ogCacheKey, ogHtml);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        if (req.method === 'HEAD') return res.status(200).end();
        return res.status(200).send(ogHtml);
      } catch (ogErr) {
        const cachedOg = cacheGet(ogCacheKey);
        if (cachedOg) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(cachedOg);
        }
        throw ogErr;
      }
    }
    if (req.query?.slug !== slugFor(name)) return res.redirect(301, linkToPage(path, reviewPage));
    const canonical = SITE + linkToPage(path, reviewPage);
    const summary = description || ('Preview and download ' + name + ' for ' + subject + ' in the EduNexus Academic Hub.');
    const title = (reviewPage > 1 ? 'Student Reviews — Page ' + reviewPage + ' | ' : '') +
      name + ' | ' + subject + (name.toLowerCase().includes('edunexus') ? '' : ' | EduNexus');
    // Keep the file accessible when the review backend is temporarily unavailable.
    let reviews = [], hasMore = false, reviewsUnavailable = false;
    try {
      ({ items: reviews, hasMore } = await listApprovedReviews(id, reviewPage));
    } catch (error) {
      reviewsUnavailable = true;
      console.error('Resource reviews temporarily unavailable', error?.message || 'unknown');
    }
    if (reviewPage > 1 && !reviewsUnavailable && reviews.length === 0) return res.status(404).send('No reviews on this page');
    const appUrl = '/?page=academic&subject=' + encodeURIComponent(subject) + '&file=' + encodeURIComponent(id) + '&panel=preview';
    const reviewUrl = appUrl + '&panel=reviews';
    const downloadLink = file.sourceType === 'supabase-storage' && file.storageBucket === 'edunexus-public-files'
      ? '<a class="button secondary" href="/api/resource-download?id=' + encodeURIComponent(id) + '">Download file</a>' : '';
    const guideCode = guideForFile(file);
    const guide = guideCode ? SUBJECT_GUIDES[guideCode] : null;
    const guideSlug = guide ? slugFor(guide.title) : '';
    const guideUrl = guide ? '/learning/' + guideCode.toLowerCase() + '/' + guideSlug : '';
    const educationalContext = guide ? '<section class="reviews" aria-label="Original course guide"><div class="meta">Original learning material · ' + h(guideCode) + '</div><h2>' + h(guide.title) + '</h2><p>' + h(guide.intro) + '</p><h3>' + h(guide.sections[0].heading) + '</h3><p>' + h(guide.sections[0].text) + '</p><a class="button" href="' + h(guideUrl) + '">Read the complete ' + h(guideCode) + ' study guide</a><p>These independent explanations do not claim to verify the contents or current syllabus of this uploaded file.</p></section>' : '';
    let relatedFiles = [];
    try {
      const library = await listPublicFiles(2);
      relatedFiles = library.filter((item) => item.id !== id &&
        String(item.subject || '').trim().toUpperCase() === subject.trim().toUpperCase()).slice(0, 4);
    } catch (error) { console.error('Related file lookup unavailable', error?.message || 'unknown'); }
    const relatedLinks = relatedFiles.length ? '<section class="reviews" aria-label="More files in this subject"><h2>More ' + h(subject) + ' study material</h2>' + relatedFiles.map((item) => '<p><a href="' + h(resourcePath(item.id, item.name || item.title)) + '">' + h(item.name || item.title || 'Study file') + '</a></p>').join('') + '</section>' : '';
    const schema = buildSchema({ name, subject, summary, canonical });
    const renderedReviews = reviews.length
      ? reviews.map((review) => {
        const rating = Number(review.rating);
        const safeRating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
        return '<article class="review"><div class="review-head"><strong>Student review</strong>' +
          (safeRating ? '<span class="stars" aria-label="' + safeRating + ' out of 5 stars">' + '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating) + '</span><span>' + safeRating + '/5</span>' : '') +
          '</div><p>' + h(String(review.comment || '')) + '</p></article>';
      }).join('')
      : reviewsUnavailable
        ? '<p>Reviews are temporarily unavailable. Open Academic Hub to try again.</p>'
        : '<p>No published reviews yet. Open this resource in EduNexus to share your experience.</p>';
    const pagination = '<nav class="pager" aria-label="Review pages">' +
      (reviewPage > 1 ? '<a rel="prev" href="' + h(linkToPage(path, reviewPage - 1)) + '">← Previous reviews</a>' : '<span></span>') +
      '<span>Reviews page ' + reviewPage + '</span>' +
      (hasMore ? '<a rel="next" href="' + h(linkToPage(path, reviewPage + 1)) + '">More reviews →</a>' : '') +
      '</nav>';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', standaloneContentSecurityPolicy);
    if (req.method === 'HEAD') return res.status(200).end();
    const fullHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title>
<meta name="description" content="${h((reviewPage > 1 ? 'Student reviews page ' + reviewPage + ': ' : '') + summary.slice(0, 155))}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="google-adsense-account" content="ca-pub-5179042048080611">${standaloneAdScript}<link rel="canonical" href="${h(canonical)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(summary.slice(0, 190))}"><meta property="og:url" content="${h(canonical)}"><meta property="og:image" content="${h(SITE + '/logo512.png')}"><meta property="og:image:alt" content="${h(name + ' — EduNexus')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(summary.slice(0, 190))}"><meta name="twitter:image" content="${h(SITE + '/logo512.png')}">
<script type="application/ld+json">${schema}</script><style>${styles}</style></head><body>${navbar}
<main><article class="resource"><div class="meta">${h(subject)} · ${h(String(file.ext || 'Study file').toUpperCase().slice(0, 12))}</div>
<h1>${h(name)}</h1><p>${h(summary)}</p><div class="buttons"><a class="button" href="${h(appUrl)}">Preview this file on EduNexus</a>${downloadLink}<a class="button secondary" href="${h(reviewUrl)}">Read and write reviews</a></div>
<p>EduNexus is an independent student learning platform. Check current course requirements with your institution. If you own rights to material that should not be shared, please contact us through the Contact page.</p></article>
${educationalContext}${relatedLinks}
<section class="reviews" aria-label="Student reviews"><h2>Student reviews${reviewPage > 1 ? ' — page ' + reviewPage : ''}</h2>
${renderedReviews}${pagination}<a href="${h(reviewUrl)}">Read and write reviews in Academic Hub</a></section></main>
<footer class="site-footer"><p>© EduNexus · Independent student study resources</p><nav aria-label="Footer links"><a href="/?page=academic">Academic Hub</a><a href="/?page=about">About</a><a href="/?page=contact">Contact</a><a href="/?page=privacy">Privacy Policy</a><a href="/?page=terms">Terms of Service</a></nav></footer></body></html>`;
    cacheSet(id + ':reviews=' + reviewPage, fullHtml);
    return res.status(200).send(fullHtml);
  } catch (error) {
    console.error('Resource page lookup failed', error?.message || 'unknown');
    const cacheKey = req.query?.ogpreview ? id + ':ogpreview' : id + ':reviews=' + reviewPage;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(cached);
    }
    // Quota outage + empty OG cache: try to salvage OG tags from a cached full page.
    if (req.query?.ogpreview) {
      const fullCached = cacheGet(id + ':reviews=1');
      if (fullCached) {
        const ogTitle = (/property="og:title" content="([^"]*)"/.exec(fullCached) || [])[1];
        const ogDesc = (/property="og:description" content="([^"]*)"/.exec(fullCached) || [])[1];
        if (ogTitle) {
          const salvaged =
            '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
            '<title>' + ogTitle + '</title>' +
            '<meta property="og:title" content="' + ogTitle + '">' +
            (ogDesc ? '<meta property="og:description" content="' + ogDesc + '">' : '') +
            '<meta property="og:image" content="' + h(SITE + '/logo512.png') + '">' +
            '<meta name="twitter:card" content="summary_large_image">' +
            '</head><body></body></html>';
          cacheSet(id + ':ogpreview', salvaged);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(salvaged);
        }
      }
    }
    return res.status(503).send(fallbackPage());
  }
}
