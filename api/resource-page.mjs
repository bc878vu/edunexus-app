import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { escapeHtml as h, getPublicFile, listPublicFiles, listApprovedReviews, resourcePath, SITE, slugFor, validId } from './resource-data.mjs';
import { guideForFile, SUBJECT_GUIDES } from './subject-guides.mjs';

// Keep the same destinations and labels as src/App.js's MAIN_ITEMS. This HTML
// is rendered on the server so search crawlers see actual file/review content.
const NAV = [
  ['/', 'Home'],
  ['/?page=academic', 'Academic Hub'],
  ['/?page=exam-prep', 'Exam Prep'],
  ['/?page=cgpa', 'CGPA Calc'],
  ['/?page=articles', 'Articles'],
  ['/?page=forum', 'Discussion'],
  ['/?page=portfolio', 'Portfolio'],
  ['/?page=about', 'About'],
  ['/?page=contact', 'Contact']
];
const navLinks = (mobile = false) => NAV.map(([url, label]) =>
  '<a href="' + h(url) + '"' + (label === 'Academic Hub' ? ' aria-current="page"' : '') +
  '>' + h(label) + '</a>').join('');
export const navbar = `<header class="site-header"><div class="nav-wrap">
  <a class="brand" href="/" aria-label="EduNexus home"><span class="brand-icon" aria-hidden="true">🎓</span><span><strong>EduNexus</strong><small>Study Material • Mock Tests • AI Tools</small></span></a>
  <nav class="desktop-links" aria-label="Main navigation">${navLinks()}</nav>
  <details class="mobile-menu"><summary aria-label="Open navigation menu">☰ <span>Menu</span></summary><nav aria-label="Mobile navigation">${navLinks(true)}</nav></details>
</div></header>`;
export const styles = `:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color-scheme:light}*{box-sizing:border-box}
body{margin:0;background:#f6f8ff;color:#172036;line-height:1.65}a{color:#4f46e5}
.site-header{position:sticky;top:0;z-index:30;background:#171d2d;color:#fff;border-bottom:1px solid #313a54}
.nav-wrap{max-width:1450px;padding:10px 18px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:22px;min-height:70px}
.brand{display:flex;gap:12px;align-items:center;flex-shrink:0;text-decoration:none;color:#e0e7ff}.brand-icon{width:43px;height:43px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(125deg,#6366f1,#8b5cf6);font-size:25px}
.brand strong{display:block;color:#93c5fd;font-size:1.2rem;line-height:1.1;font-weight:850}.brand small{display:block;color:#cbd5e1;font-size:.73rem;margin-top:3px}
.desktop-links{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:2px}
.desktop-links a,.mobile-menu nav a{color:#e2e8f0;text-decoration:none;font-weight:650;white-space:nowrap;padding:10px 12px;border-radius:28px;font-size:.9rem}
.desktop-links a:hover,.mobile-menu nav a:hover{background:#334155}.desktop-links [aria-current=page],.mobile-menu nav [aria-current=page]{background:#6366f1;color:white}
.mobile-menu{display:none;position:relative}.mobile-menu summary{cursor:pointer;padding:8px 12px;border:1px solid #52607b;border-radius:10px;list-style:none;font-weight:700}.mobile-menu summary::-webkit-details-marker{display:none}
.mobile-menu nav{position:absolute;right:0;top:calc(100% + 12px);width:min(290px,calc(100vw - 25px));padding:12px;display:grid;gap:4px;background:#1e293b;border:1px solid #64748b;box-shadow:0 12px 30px #0003;border-radius:12px}
.mobile-menu nav a{display:block}.mobile-menu:not([open]) nav{display:none}
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
@media(max-width:480px){.nav-wrap{padding:8px 12px}.brand small{font-size:.62rem}.brand-icon{width:36px;height:36px}.resource,.reviews{padding:18px}main{margin-top:17px;padding:0 12px}}
`;
const validReviewPage = (raw) => {
  if (raw == null || raw === '') return 1;
  if (!/^[1-9][0-9]{0,3}$/.test(String(raw))) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n <= 1000 ? n : null;
};
function linkToPage(path, page) { return path + (page > 1 ? '?reviews=' + page : ''); }
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
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  const id = String(req.query?.id || '');
  const reviewPage = validReviewPage(req.query?.reviews);
  if (!validId(id) || reviewPage === null) return res.status(404).send('Resource not found');
  try {
    const file = await getPublicFile(id);
    if (!file) return res.status(404).send('Resource not found');
    const name = String(file.name || file.title || 'Study resource').slice(0, 180);
    const subject = String(file.subject || 'General').slice(0, 120);
    const description = String(file.description || '').trim().slice(0, 3500);
    const path = resourcePath(id, name);
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
    const appUrl = '/?page=academic&file=' + encodeURIComponent(id);
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
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title>
<meta name="description" content="${h((reviewPage > 1 ? 'Student reviews page ' + reviewPage + ': ' : '') + summary.slice(0, 155))}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="google-adsense-account" content="ca-pub-5179042048080611">${standaloneAdScript}<link rel="canonical" href="${h(canonical)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(summary.slice(0, 190))}"><meta property="og:url" content="${h(canonical)}">
<script type="application/ld+json">${schema}</script><style>${styles}</style></head><body>${navbar}
<main><article class="resource"><div class="meta">${h(subject)} · ${h(String(file.ext || 'Study file').toUpperCase().slice(0, 12))}</div>
<h1>${h(name)}</h1><p>${h(summary)}</p><div class="buttons"><a class="button" href="${h(appUrl)}">Preview this file on EduNexus</a>${downloadLink}<a class="button secondary" href="${h(reviewUrl)}">Read and write reviews</a></div>
<p>EduNexus is an independent student learning platform. Check current course requirements with your institution. If you own rights to material that should not be shared, please contact us through the Contact page.</p></article>
${educationalContext}${relatedLinks}
<section class="reviews" aria-label="Student reviews"><h2>Student reviews${reviewPage > 1 ? ' — page ' + reviewPage : ''}</h2>
${renderedReviews}${pagination}<a href="${h(reviewUrl)}">Read and write reviews in Academic Hub</a></section></main>
<footer class="site-footer"><p>© EduNexus · Independent student study resources</p><nav aria-label="Footer links"><a href="/?page=academic">Academic Hub</a><a href="/?page=about">About</a><a href="/?page=contact">Contact</a><a href="/?page=privacy">Privacy Policy</a><a href="/?page=terms">Terms of Service</a></nav></footer></body></html>`);
  } catch (error) {
    console.error('Resource page lookup failed', error?.message || 'unknown');
    return res.status(503).send('This resource is temporarily unavailable. Please try again shortly.');
  }
}
