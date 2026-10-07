import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { renderNavbar, renderFooter, renderThemeToggle, shellThemeBoot, navStyles } from './site-shell.mjs';
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

  // Portfolio share links (?page=portfolio and /portfolio): crawlers get a
  // server-rendered portfolio preview. vercel.json routes crawler user-agents
  // here; direct browser hits get a 302 to the portfolio page (loop-free:
  // the function never 302s to a URL that rewrites back to itself).
  if (String(req.query?.ogpage || '') === 'portfolio') {
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const isCrawler = /whatsapp|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|skypeuripreview|googlebot|bingbot|pinterestbot|embedly|quora|vkshare/.test(ua);
    const appUrl = SITE + '/portfolio';
    if (!isCrawler) return res.redirect(302, appUrl);
    const title = 'Asad Amanat Ali — Software Engineer & Web Developer | Creator of EduNexus';
    const desc = 'Asad Amanat Ali — Software Engineer & Web Developer from Pakistan and creator of EduNexus. Explore my projects, skills, and experience.';
    const image = SITE + '/portfolio-og.jpg?v=2';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><meta name="description" content="${h(desc)}"><meta name="robots" content="noindex,follow"><meta property="og:type" content="profile"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(desc)}"><meta property="og:url" content="${h(appUrl)}"><meta property="og:image" content="${h(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(desc)}"><meta name="twitter:image" content="${h(image)}"><meta http-equiv="refresh" content="0;url=${h(appUrl)}"></head><body><p><a href="${h(appUrl)}">${h(title)}</a></p></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  }

  // Generic share pages (?page=exam-prep, ?page=academic, /paper-reviews,
  // /mcq-bank): crawlers get a server-rendered preview with that page's own
  // title and description — never a subject name. vercel.json routes crawler
  // user-agents here; direct browser hits get a 302 to the page (loop-free:
  // the function never 302s to a URL that rewrites back to itself).
  const ogPage = String(req.query?.ogpage || '');
  if (ogPage === 'paperreviews' || ogPage === 'mcqbank' || ogPage === 'examprep' || ogPage === 'academic') {
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const isCrawler = /whatsapp|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|skypeuripreview|googlebot|bingbot|pinterestbot|embedly|quora|vkshare/.test(ua);
    const pages = {
      paperreviews: {
        appUrl: SITE + '/paper-reviews',
        title: 'Paper Reviews | EduNexus',
        desc: 'Read real paper reviews by VU students on EduNexus — paper patterns, important topics, difficulty level and exam tips. Share your own paper review.',
        image: SITE + '/paper-reviews-og.jpg'
      },
      mcqbank: {
        appUrl: SITE + '/mcq-bank',
        title: 'MCQ Bank | EduNexus',
        desc: 'Practice solved MCQs for VU subjects on EduNexus — important and repeated questions with answers, free for students.',
        image: SITE + '/mcq-bank-og.jpg'
      },
      examprep: {
        appUrl: SITE + '/exam-prep',
        title: 'VU Exam MCQ Bank & Paper Reviews | EduNexus',
        desc: 'Practice subject-wise VU MCQs, explore completed-exam paper reviews and find exam preparation resources.',
        image: SITE + '/mcq-bank-og.jpg'
      },
      academic: {
        appUrl: SITE + '/academic',
        title: 'VU Notes, Handouts & Past Papers | EduNexus Academic Hub',
        desc: 'Explore organized Virtual University notes, handouts, course files and past-paper resources with subject-focused search and quick access.',
        image: SITE + '/logo512.png'
      }
    };
    const pg = pages[ogPage];
    if (!isCrawler) return res.redirect(302, pg.appUrl);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(pg.title)}</title><meta name="description" content="${h(pg.desc)}"><meta name="robots" content="noindex,follow"><meta property="og:type" content="website"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(pg.title)}"><meta property="og:description" content="${h(pg.desc)}"><meta property="og:url" content="${h(pg.appUrl)}"><meta property="og:image" content="${h(pg.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(pg.title)}"><meta name="twitter:description" content="${h(pg.desc)}"><meta name="twitter:image" content="${h(pg.image)}"><meta http-equiv="refresh" content="0;url=${h(pg.appUrl)}"></head><body><p><a href="${h(pg.appUrl)}">${h(pg.title)}</a></p></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  }

  // Academic subject pages: /academic/CS101 (via a crawler-gated vercel.json
  // rewrite). Crawlers get a subject-specific preview; normal browsers get a
  // 302 to the SPA subject page (loop-free: the rewrite only fires for crawlers).
  if (ogPage === 'academicsubject') {
    const rawSubj = String(req.query?.subject || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || 'VU';
    const pretty = rawSubj.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'VU';
    const appUrl = SITE + '/academic/' + encodeURIComponent(rawSubj);
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const isCrawler = /whatsapp|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|skypeuripreview|googlebot|bingbot|pinterestbot|embedly|quora|vkshare/.test(ua);
    if (!isCrawler) return res.redirect(302, appUrl);
    const title = pretty + ' Notes, Handouts & Past Papers | EduNexus';
    const desc = 'Download ' + pretty + ' study resources on EduNexus Academic Hub — notes, handouts, solved MCQs, past papers and course files shared by Virtual University students, free.';
    const image = SITE + '/logo512.png';
    const bodyContent = '<main style="max-width:820px;margin:40px auto;padding:0 20px;font-family:system-ui;line-height:1.7">'
      + '<h1>' + h(pretty + ' Notes, Handouts & Past Papers') + '</h1>'
      + '<p>' + h(desc) + '</p>'
      + '<h2>What you will find for ' + h(pretty) + '</h2>'
      + '<ul><li>' + h(pretty) + ' handouts and lecture notes</li>'
      + '<li>' + h(pretty) + ' midterm and final term solved MCQs</li>'
      + '<li>' + h(pretty) + ' past papers and paper reviews</li>'
      + '<li>' + h(pretty) + ' subjective solved questions</li></ul>'
      + '<p><a href="' + h(appUrl) + '">Open ' + h(pretty) + ' study resources on EduNexus</a></p></main>';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><meta name="description" content="${h(desc)}"><link rel="canonical" href="${h(appUrl)}"><meta name="robots" content="index,follow"><meta property="og:type" content="website"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(desc)}"><meta property="og:url" content="${h(appUrl)}"><meta property="og:image" content="${h(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(desc)}"><meta name="twitter:image" content="${h(image)}"></head><body>${bodyContent}</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  }

  // Exam-prep share links: /exam-prep/CS101/midterm/mcqs (via vercel.json rewrite).
  // Crawlers (WhatsApp etc.) get server-rendered OG tags so the preview shows the
  // subject's MCQ bank / paper reviews. Browsers get a 302 to the SPA URL.
  // Regular browsers never hit this branch for other URLs.
  const epShare = String(req.query?.examprep || '');
  const epSection = String(req.query?.section || '');
  if (epShare === '1' && (epSection === 'mcqs' || epSection === 'reviews')) {
    const rawSubject = String(req.query?.subject || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'VU';
    const rawTerm = String(req.query?.term || '').toLowerCase();
    const term = rawTerm === 'quiz' ? 'Quiz' : rawTerm === 'finalterm' ? 'Finalterm' : 'Midterm';
    const isMcq = epSection === 'mcqs';
    const appUrl = SITE + '/?page=exam-prep&section=' + epSection + '&subject=' + encodeURIComponent(rawSubject) + '&term=' + encodeURIComponent(rawTerm || 'midterm');
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const isCrawler = /whatsapp|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|skypeuripreview|googlebot|bingbot|pinterestbot|embedly|quora|vkshare/.test(ua);
    if (!isCrawler) return res.redirect(302, appUrl);
    const title = isMcq
      ? rawSubject + ' ' + term + ' Solved MCQs | EduNexus'
      : 'Paper Reviews | EduNexus';
    const desc = isMcq
      ? 'Practice ' + rawSubject + ' ' + term + ' solved MCQs on EduNexus — important and repeated questions with answers, free for VU students.'
      : 'Read real paper reviews by VU students on EduNexus — paper patterns, important topics, difficulty level and exam tips. Share your own paper review.';
    const image = SITE + (isMcq ? '/mcq-bank-og.jpg' : '/paper-reviews-og.jpg');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><meta name="description" content="${h(desc)}"><meta name="robots" content="noindex,follow"><meta property="og:type" content="website"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(desc)}"><meta property="og:url" content="${h(appUrl)}"><meta property="og:image" content="${h(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(desc)}"><meta name="twitter:image" content="${h(image)}"><meta http-equiv="refresh" content="0;url=${h(appUrl)}"></head><body><p><a href="${h(appUrl)}">${h(title)}</a></p></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  }

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
<meta name="google-adsense-account" content="ca-pub-5179042048080611">${shellThemeBoot}${standaloneAdScript}<link rel="canonical" href="${h(canonical)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(summary.slice(0, 190))}"><meta property="og:url" content="${h(canonical)}">
<script type="application/ld+json">${schema}</script><style>${styles}</style></head><body>${navbar}${renderThemeToggle()}
<main><article class="resource"><div class="meta">${h(subject)} · ${h(String(file.ext || 'Study file').toUpperCase().slice(0, 12))}</div>
<h1>${h(name)}</h1><p>${h(summary)}</p><div class="buttons"><a class="button" href="${h(appUrl)}">Preview this file on EduNexus</a>${downloadLink}<a class="button secondary" href="${h(reviewUrl)}">Read and write reviews</a></div>
<p>EduNexus is an independent student learning platform. Check current course requirements with your institution. If you own rights to material that should not be shared, please contact us through the Contact page.</p></article>
${educationalContext}${relatedLinks}
<section class="reviews" aria-label="Student reviews"><h2>Student reviews${reviewPage > 1 ? ' — page ' + reviewPage : ''}</h2>
${renderedReviews}${pagination}<a href="${h(reviewUrl)}">Read and write reviews in Academic Hub</a></section></main>
${renderFooter()}</body></html>`);
  } catch (error) {
    console.error('Resource page lookup failed', error?.message || 'unknown');
    return res.status(503).send('This resource is temporarily unavailable. Please try again shortly.');
  }
}
