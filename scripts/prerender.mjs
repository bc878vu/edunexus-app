// Build-time prerender for SEO: after `npm run build`, reads build/index.html
// as a template and writes one static HTML file per public route into
// build/<route>/index.html. Crawlers see real titles, meta tags and content
// inside <div id="root">; the SPA replaces that static block on load for users.
// The route list is derived from public/sitemap.xml (never hardcoded) plus a
// small fixed list of SPA pages, capped at MAX_ROUTES.
//
// Robustness contract: every route is wrapped in try/catch. A failing route
// still gets a file (template copy with corrected canonical + title). The
// script ALWAYS exits 0 so it can never break `npm run build`.
//
// Test hook: set PRERENDER_ROOT to run against a stub repo layout.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SITE, canonicalPath, displaySubjectName } from '../src/site-seo.mjs';
import { routeFromLocation, routeParamsFromPath } from '../src/app-routes.mjs';
import { SEO_PAGE_DATA } from '../src/SEO.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const MAX_ROUTES = 60;

// SPA pages that always get a static file, even if the sitemap omits them.
const FIXED_ROUTES = [
  '/', '/exam-prep', '/vu-notes', '/articles', '/quizzes', '/cgpa-calculator',
  '/about', '/contact', '/privacy', '/terms', '/forum', '/tutorials'
];

const DEFAULT_ROBOTS = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const termLabelOf = (term) => {
  const t = String(term || '').toLowerCase();
  if (t === 'midterm') return 'Midterm';
  if (t === 'finalterm') return 'Final Term';
  return '';
};

// ---- route list -----------------------------------------------------------
function routesFromSitemap(root) {
  const routes = [];
  const sitemapPath = join(root, 'public', 'sitemap.xml');
  if (!existsSync(sitemapPath)) return routes;
  const xml = readFileSync(sitemapPath, 'utf8');
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const loc = match[1].replace(/&amp;/g, '&').trim();
    let url;
    try { url = new URL(loc); } catch (_) { continue; }
    let pathname = url.pathname.replace(/\/$/, '') || '/';
    const search = url.search || '';
    // API-rendered pages (/learning/..., *-sitemap.xml) and non-SPA assets
    // are not prerendered; only real SPA routes go through this script.
    if (pathname.startsWith('/learning/')) continue;
    if (/\.[a-z0-9]+$/i.test(pathname)) continue;
    const pathParams = routeParamsFromPath(pathname);
    const page = routeFromLocation({ pathname, search });
    if (!pathParams.page && page === 'home' && pathname !== '/') continue;
    routes.push({ pathname, search });
    if (routes.length >= MAX_ROUTES) break;
  }
  return routes;
}

function collectRoutes(root) {
  const seen = new Set();
  const routes = [];
  const push = (pathname, search = '') => {
    const key = pathname + search;
    if (seen.has(key) || routes.length >= MAX_ROUTES) return;
    seen.add(key);
    routes.push({ pathname, search });
  };
  for (const pathname of FIXED_ROUTES) push(pathname);
  for (const route of routesFromSitemap(root)) push(route.pathname, route.search);
  return routes;
}

// ---- per-route SEO ----------------------------------------------------------
function routeSeo(route) {
  const { pathname, search } = route;
  const pathParams = routeParamsFromPath(pathname);
  const page = routeFromLocation({ pathname, search });
  const data = SEO_PAGE_DATA[page] || SEO_PAGE_DATA.home;
  const query = new URLSearchParams(search || '');
  const subjectRaw = query.get('subject') || pathParams.subject || '';
  const termRaw = query.get('term') || pathParams.term || '';
  const termLabel = termLabelOf(termRaw);

  let title = data[0];
  let description = data[1];
  let keywords = data[2];
  let bank = null;
  if (page === 'exam-prep') {
    const subject = subjectRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (subject && termLabel) {
      bank = { subject, termLabel };
      title = subject + ' ' + termLabel + ' Solved MCQs | EduNexus';
      description = 'Practice ' + subject + ' ' + termLabel + ' solved MCQs with answers, explore paper reviews and prepare for your Virtual University ' + subject + ' exam on EduNexus.';
      keywords += ', ' + subject + ' solved MCQs, ' + subject + ' ' + termLabel + ' MCQs, VU ' + subject + ' past papers';
    }
  } else if (page === 'academic') {
    const subject = displaySubjectName(subjectRaw);
    if (subject) {
      title = subject + ' Notes, Handouts & Past Papers | EduNexus';
      description = 'Download ' + subject + ' notes, handouts and past papers for Virtual University students on EduNexus.';
      keywords += ', ' + subject + ' notes, ' + subject + ' handouts';
    }
  }
  const canonical = SITE + canonicalPath(page, search, { subject: subjectRaw, term: termRaw });
  return { page, pathParams, title, description, keywords, canonical, schemaType: data[3], bank, subjectRaw };
}

// ---- static content block ----------------------------------------------------
function staticBlock(route, seo, banks) {
  const links = [];
  const addLink = (href, label) => {
    if (href !== route.pathname) links.push('<a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>');
  };
  let h1;
  let paragraphs = [];
  if (seo.bank) {
    const { subject, termLabel } = seo.bank;
    h1 = subject + ' ' + termLabel + ' Solved MCQs';
    paragraphs = [
      'Practice ' + subject + ' ' + termLabel + ' solved MCQs with answers on EduNexus. This bank collects subject-wise multiple-choice questions to help Virtual University students revise key concepts before the exam.',
      'Use it together with the completed-exam paper reviews in the Exam Prep section to see which topics students found important, then test yourself again until the answers feel automatic.'
    ];
    addLink('/exam-prep', 'All MCQ banks');
    for (const bank of banks) {
      if (bank.route.pathname !== route.pathname && links.length < 8) {
        addLink(bank.route.pathname, bank.seo.bank.subject + ' ' + bank.seo.bank.termLabel + ' MCQs');
      }
    }
    addLink('/vu-notes', 'VU notes & handouts library');
  } else if (seo.page === 'academic' && seo.subjectRaw) {
    const subject = displaySubjectName(seo.subjectRaw);
    h1 = subject + ' Notes, Handouts & Past Papers';
    paragraphs = [
      'Browse ' + subject + ' study material on EduNexus: organized notes, handouts and past-paper resources for Virtual University students.',
      'Open the subject view to search files, preview documents before downloading, and read student reviews about each resource.'
    ];
    addLink('/vu-notes', 'All subjects');
    addLink('/exam-prep', 'Exam MCQ banks');
  } else {
    h1 = seo.title.split('|')[0].trim();
    paragraphs = [seo.description];
    if (seo.page === 'home') {
      paragraphs.push('EduNexus brings the library, exam preparation banks, quizzes, CGPA calculator and study tools together in one place built for Virtual University students.');
    }
    addLink('/', 'Home');
    addLink('/vu-notes', 'VU notes & handouts');
    addLink('/exam-prep', 'Exam MCQ banks');
    addLink('/quizzes', 'AI quiz generator');
    addLink('/cgpa-calculator', 'CGPA calculator');
    addLink('/articles', 'Study guides & articles');
  }
  const linkHtml = links.length
    ? '<nav aria-label="Related pages"><p>Related: ' + links.join(' · ') + '</p></nav>'
    : '';
  const css = '<style>'
    + '.edx-boot{min-height:100vh;min-height:100dvh;margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
    + 'background:linear-gradient(120deg,#312e81,#4f46e5,#7c3aed,#2563eb,#4f46e5,#312e81);background-size:300% 300%;'
    + 'animation:edxGradShift 14s ease infinite;color:#fff;display:flex;flex-direction:column;align-items:center;'
    + 'overflow-x:hidden;position:relative}'
    + '.edx-blob{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5;pointer-events:none;z-index:0}'
    + '.edx-blob-1{width:340px;height:340px;background:#a78bfa;top:-90px;left:-80px;animation:edxFloat1 11s ease-in-out infinite}'
    + '.edx-blob-2{width:300px;height:300px;background:#60a5fa;bottom:-70px;right:-60px;animation:edxFloat2 13s ease-in-out infinite}'
    + '.edx-blob-3{width:220px;height:220px;background:#f472b6;top:38%;left:62%;animation:edxFloat1 15s ease-in-out infinite reverse}'
    + '.edx-boot-inner{position:relative;z-index:1;width:100%;display:flex;flex-direction:column;align-items:center}'
    + '.edx-boot-top{width:100%;max-width:1120px;display:flex;align-items:center;justify-content:space-between;'
    + 'padding:18px 24px;box-sizing:border-box}'
    + '.edx-boot-logo{font-weight:800;font-size:1.35rem;letter-spacing:.02em;color:#fff;text-decoration:none;'
    + 'display:flex;align-items:center;gap:10px}'
    + '.edx-boot-logo-mark{width:40px;height:40px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;'
    + 'background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);font-size:1.3rem;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.25);backdrop-filter:blur(6px);animation:edxBob 3s ease-in-out infinite}'
    + '.edx-boot-pill{font-size:.8rem;font-weight:600;padding:9px 18px;border-radius:999px;color:#eef2ff;text-decoration:none;'
    + 'background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(6px);'
    + 'transition:background .25s}'
    + '.edx-boot-pill:hover{background:rgba(255,255,255,.22)}'
    + '.edx-boot-hero{text-align:center;padding:46px 24px 24px;max-width:780px;box-sizing:border-box;animation:edxFadeUp .7s ease both}'
    + '.edx-boot-kicker{display:inline-block;font-size:.76rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;'
    + 'color:#e0e7ff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);'
    + 'padding:7px 18px;border-radius:999px;margin-bottom:20px;backdrop-filter:blur(6px)}'
    + '.edx-boot h1{font-size:clamp(1.7rem,4.5vw,2.9rem);line-height:1.18;margin:0 0 14px;font-weight:800;letter-spacing:-.01em;'
    + 'text-shadow:0 2px 18px rgba(0,0,0,.25)}'
    + '.edx-boot-desc{margin:0 auto 24px;max-width:640px;color:#e0e7ff;font-size:1.02rem;line-height:1.65}'
    + '.edx-boot-loader{display:flex;flex-direction:column;align-items:center;gap:14px;margin:4px 0 6px}'
    + '.edx-loader-row{display:flex;align-items:center;gap:14px}'
    + '.edx-spinner{width:46px;height:46px;border-radius:50%;border:4px solid rgba(255,255,255,.22);'
    + 'border-top-color:#fff;animation:edxSpin .9s linear infinite;box-shadow:0 0 26px rgba(255,255,255,.28)}'
    + '.edx-boot-loadtext{font-size:.96rem;color:#eef2ff;font-weight:600;letter-spacing:.04em}'
    + '.edx-dots::after{content:"";animation:edxDots 1.4s steps(4) infinite}'
    + '.edx-progress{width:min(420px,72vw);height:8px;border-radius:99px;background:rgba(255,255,255,.16);'
    + 'overflow:hidden;position:relative;box-shadow:inset 0 1px 3px rgba(0,0,0,.2)}'
    + '.edx-progress::after{content:"";position:absolute;top:0;bottom:0;width:38%;border-radius:99px;'
    + 'background:linear-gradient(90deg,rgba(255,255,255,.55),#fff,rgba(255,255,255,.55));'
    + 'animation:edxSlide 1.6s ease-in-out infinite}'
    + '.edx-tips{position:relative;height:1.7em;margin:2px 0 0;min-width:min(480px,80vw)}'
    + '.edx-tip{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;'
    + 'font-size:.88rem;color:#dbe4ff;opacity:0;animation:edxTipCycle 12s ease-in-out infinite}'
    + '.edx-tip:nth-child(2){animation-delay:3s}.edx-tip:nth-child(3){animation-delay:6s}.edx-tip:nth-child(4){animation-delay:9s}'
    + '.edx-tip-ic{font-size:1rem}'
    + '.edx-boot-stats{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin:22px 0 4px;'
    + 'animation:edxFadeUp .7s .1s ease both}'
    + '.edx-stat{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.20);border-radius:16px;'
    + 'padding:12px 22px;backdrop-filter:blur(8px);text-align:center;min-width:118px;box-shadow:0 10px 26px rgba(0,0,0,.16)}'
    + '.edx-stat b{display:block;font-size:1.35rem;font-weight:800;letter-spacing:-.01em;animation:edxPulse 2.4s ease-in-out infinite}'
    + '.edx-stat span{font-size:.74rem;color:#cdd8ff;letter-spacing:.06em;text-transform:uppercase;font-weight:600}'
    + '.edx-boot-grid{width:100%;max-width:1120px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));'
    + 'gap:16px;padding:24px 24px 8px;box-sizing:border-box;animation:edxFadeUp .7s .18s ease both}'
    + '.edx-sk{border-radius:18px;padding:18px 14px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);'
    + 'backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.18);min-height:118px;position:relative;overflow:hidden}'
    + '.edx-sk::after{content:"";position:absolute;inset:0;'
    + 'background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.24) 50%,transparent 80%);'
    + 'animation:edxShimmer 1.9s ease-in-out infinite;transform:translateX(-100%)}'
    + '.edx-sk:nth-child(2)::after{animation-delay:.15s}.edx-sk:nth-child(3)::after{animation-delay:.3s}'
    + '.edx-sk:nth-child(4)::after{animation-delay:.45s}.edx-sk:nth-child(5)::after{animation-delay:.6s}'
    + '.edx-sk:nth-child(6)::after{animation-delay:.75s}.edx-sk:nth-child(7)::after{animation-delay:.9s}'
    + '.edx-sk:nth-child(8)::after{animation-delay:1.05s}'
    + '.edx-sk-ic{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.22);margin-bottom:12px}'
    + '.edx-sk-t{height:13px;border-radius:7px;background:rgba(255,255,255,.28);margin-bottom:8px;width:85%}'
    + '.edx-sk-s{height:10px;border-radius:6px;background:rgba(255,255,255,.18);width:60%}'
    + '.edx-boot-seo{position:relative;z-index:1;width:100%;max-width:1120px;margin-top:auto;padding:28px 24px 26px;'
    + 'box-sizing:border-box;color:#c7d2fe;font-size:.86rem;line-height:1.7;animation:edxFadeUp .7s .28s ease both}'
    + '.edx-boot-seo p{margin:0 0 10px;max-width:840px}'
    + '.edx-boot-seo nav p{margin:14px 0 0}'
    + '.edx-boot-seo a{color:#eef2ff;text-decoration:none;border-bottom:1px dotted rgba(255,255,255,.5)}'
    + '.edx-boot-seo a:hover{color:#fff;border-bottom-style:solid}'
    + '@keyframes edxSpin{to{transform:rotate(360deg)}}'
    + '@keyframes edxShimmer{60%,100%{transform:translateX(100%)}}'
    + '@keyframes edxDots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}'
    + '@keyframes edxFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'
    + '@keyframes edxGradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}'
    + '@keyframes edxFloat1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(46px,-34px) scale(1.12)}}'
    + '@keyframes edxFloat2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-52px,30px) scale(1.08)}}'
    + '@keyframes edxBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}'
    + '@keyframes edxPulse{0%,100%{opacity:1}50%{opacity:.72}}'
    + '@keyframes edxSlide{0%{left:-38%}100%{left:100%}}'
    + '@keyframes edxTipCycle{0%{opacity:0;transform:translateY(8px)}4%,21%{opacity:1;transform:none}25%,100%{opacity:0;transform:translateY(-8px)}}'
    + '@media (max-width:640px){.edx-boot-hero{padding:36px 18px 20px}.edx-boot-grid{grid-template-columns:repeat(2,1fr);'
    + 'gap:12px;padding:18px 16px 6px}.edx-boot-top{padding:14px 16px}.edx-stat{min-width:100px;padding:10px 14px}}'
    + '@media (prefers-reduced-motion:reduce){.edx-boot,.edx-blob,.edx-spinner,.edx-sk::after,.edx-progress::after,'
    + '.edx-tip,.edx-boot-logo-mark,.edx-stat b{animation:none!important}}'
    + '@media (prefers-color-scheme:dark){.edx-boot{filter:saturate(1.12)}}'
    + '</style>';
  const skeletons = [0, 1, 2, 3, 4, 5, 6, 7]
    .map(() => '<div class="edx-sk" aria-hidden="true"><div class="edx-sk-ic"></div><div class="edx-sk-t"></div><div class="edx-sk-s"></div></div>')
    .join('');
  const tips = [
    ['💡', 'Tip: Use the search bar to find any file across the full library'],
    ['⚡', 'Tip: Past-paper MCQs repeat often — revise them first'],
    ['📚', 'Tip: Preview any file before downloading it'],
    ['🎯', 'Tip: Check paper reviews to see what students found important'],
  ].map(([ic, tx]) => '<span class="edx-tip"><span class="edx-tip-ic">' + ic + '</span>' + escapeHtml(tx) + '</span>').join('');
  const seoParas = paragraphs.map((p) => '<p>' + escapeHtml(p) + '</p>').join('');
  return '<main class="edx-prerender-static" style="margin:0">'
    + css
    + '<div class="edx-boot">'
    + '<div class="edx-blob edx-blob-1" aria-hidden="true"></div>'
    + '<div class="edx-blob edx-blob-2" aria-hidden="true"></div>'
    + '<div class="edx-blob edx-blob-3" aria-hidden="true"></div>'
    + '<div class="edx-boot-inner">'
    + '<div class="edx-boot-top"><a class="edx-boot-logo" href="/"><span class="edx-boot-logo-mark">🎓</span>EduNexus</a>'
    + '<a class="edx-boot-pill" href="/vu-notes">Browse library</a></div>'
    + '<section class="edx-boot-hero"><span class="edx-boot-kicker">Virtual University Study Hub</span>'
    + '<h1>' + escapeHtml(h1) + '</h1>'
    + '<p class="edx-boot-desc">' + escapeHtml(paragraphs[0] || '') + '</p>'
    + '<div class="edx-boot-loader"><div class="edx-loader-row"><div class="edx-spinner" role="status" aria-label="Loading"></div>'
    + '<span class="edx-boot-loadtext">Loading your study hub<span class="edx-dots"></span></span></div>'
    + '<div class="edx-progress" aria-hidden="true"></div>'
    + '<div class="edx-tips" aria-hidden="true">' + tips + '</div></div>'
    + '</section>'
    + '<div class="edx-boot-stats" aria-hidden="true">'
    + '<div class="edx-stat"><b>430+</b><span>Study files</span></div>'
    + '<div class="edx-stat"><b>26K+</b><span>Solved MCQs</span></div>'
    + '<div class="edx-stat"><b>47</b><span>Subjects</span></div>'
    + '</div>'
    + '<div class="edx-boot-grid">' + skeletons + '</div>'
    + '<div class="edx-boot-seo">' + seoParas + linkHtml + '</div>'
    + '</div></div></main>';
}

// ---- template transform -------------------------------------------------------
function replaceTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', replacement + '</head>');
}

function renderRoute(template, route, seo, banks, robots) {
  const esc = escapeHtml;
  let html = template;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/,
    '<title>' + esc(seo.title) + '</title>');
  html = replaceTag(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    '<meta name="description" content="' + esc(seo.description) + '"/>');
  html = replaceTag(html, /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
    '<meta name="keywords" content="' + esc(seo.keywords) + '"/>');
  html = replaceTag(html, /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="' + esc(robots) + '"/>');
  html = replaceTag(html, /<meta\s+name="googlebot"\s+content="[^"]*"\s*\/?>/,
    '<meta name="googlebot" content="' + esc(robots) + '"/>');
  html = replaceTag(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    '<link rel="canonical" href="' + esc(seo.canonical) + '"/>');
  html = replaceTag(html, /<link\s+rel="sitemap"[^>]*>/,
    '<link rel="sitemap" type="application/xml" href="' + esc(SITE + '/sitemap.xml') + '"/>');
  html = replaceTag(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    '<meta property="og:title" content="' + esc(seo.title) + '"/>');
  html = replaceTag(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    '<meta property="og:description" content="' + esc(seo.description) + '"/>');
  html = replaceTag(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    '<meta property="og:url" content="' + esc(seo.canonical) + '"/>');
  html = replaceTag(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    '<meta property="og:image" content="' + esc(SITE + '/logo512.png') + '"/>');
  html = replaceTag(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    '<meta name="twitter:title" content="' + esc(seo.title) + '"/>');
  html = replaceTag(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    '<meta name="twitter:description" content="' + esc(seo.description) + '"/>');
  html = replaceTag(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    '<meta name="twitter:image" content="' + esc(SITE + '/logo512.png') + '"/>');
  // Exactly one JSON-LD block per page: drop the template's static blocks.
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': seo.schemaType,
    name: seo.title.split('|')[0].trim(), url: seo.canonical, description: seo.description,
    isPartOf: { '@type': 'WebSite', name: 'EduNexus', url: SITE }
  }).replace(/</g, '\\u003c');
  html = html.replace('</head>', '<script type="application/ld+json">' + jsonLd + '</script></head>');
  // Static content inside #root: crawlers read it, the SPA replaces it on load.
  const block = staticBlock(route, seo, banks);
  if (/<div\s+id="root"\s*><\/div>/.test(html)) {
    html = html.replace(/<div\s+id="root"\s*><\/div>/, '<div id="root">' + block + '</div>');
  }
  return html;
}

// Fallback for a route that failed to render: template copy with corrected
// canonical + title so the file is never empty or wrong.
function renderFallback(template, route, seoLike, robots) {
  let html = template;
  const title = (seoLike && seoLike.title) || 'EduNexus | VU Notes, Handouts, Past Papers & AI Study Tools';
  const canonical = (seoLike && seoLike.canonical) || (SITE + route.pathname);
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(title) + '</title>');
  html = replaceTag(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    '<link rel="canonical" href="' + escapeHtml(canonical) + '"/>');
  html = replaceTag(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    '<meta property="og:url" content="' + escapeHtml(canonical) + '"/>');
  html = replaceTag(html, /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="' + escapeHtml(robots) + '"/>');
  return html;
}

function outPathFor(route, buildDir) {
  // Legacy query-string routes land on their pretty canonical location.
  let out = route.pathname;
  if (route.search) {
    const pathParams = routeParamsFromPath(route.pathname);
    const page = routeFromLocation({ pathname: route.pathname, search: route.search });
    const query = new URLSearchParams(route.search);
    out = canonicalPath(page, route.search, {
      subject: query.get('subject') || pathParams.subject || '',
      term: query.get('term') || pathParams.term || ''
    });
  }
  const rel = out === '/' ? 'index.html' : out.replace(/^\//, '') + '/index.html';
  return join(buildDir, ...rel.split('/'));
}

export async function prerender(rootDir) {
  const root = rootDir || REPO_ROOT;
  const buildDir = join(root, 'build');
  const templatePath = join(buildDir, 'index.html');
  if (!existsSync(templatePath)) {
    console.warn('prerender: no build/index.html found under ' + buildDir + '; skipping.');
    return { written: 0, routes: [] };
  }
  const template = readFileSync(templatePath, 'utf8');
  const robotsMatch = template.match(/<meta\s+name="robots"\s+content="([^"]*)"/);
  const robots = robotsMatch ? robotsMatch[1] : DEFAULT_ROBOTS;

  const routes = collectRoutes(root);
  const withSeo = routes.map((route) => ({ route, seo: routeSeo(route) }));
  const banks = withSeo.filter((entry) => entry.seo.bank);

  const seenFiles = new Set();
  let written = 0;
  const report = [];
  for (const { route, seo } of withSeo) {
    try {
      const outFile = outPathFor(route, buildDir);
      if (seenFiles.has(outFile)) continue;
      seenFiles.add(outFile);
      const html = renderRoute(template, route, seo, banks, robots);
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, html, 'utf8');
      written += 1;
      report.push(route.pathname + (route.search || ''));
    } catch (err) {
      try {
        const outFile = outPathFor(route, buildDir);
        if (!seenFiles.has(outFile)) {
          seenFiles.add(outFile);
          mkdirSync(dirname(outFile), { recursive: true });
          writeFileSync(outFile, renderFallback(template, route, seo, robots), 'utf8');
          written += 1;
        }
        console.warn('prerender: route ' + route.pathname + ' failed, wrote fallback: ' + (err && err.message));
      } catch (_) { /* never break the build */ }
    }
  }
  return { written, routes: report };
}

async function main() {
  try {
    const root = process.env.PRERENDER_ROOT || REPO_ROOT;
    const { written, routes } = await prerender(root);
    console.log('prerender: wrote ' + written + ' static route(s)');
    for (const route of routes) console.log('prerender:   ' + route);
  } catch (err) {
    console.error('prerender: unexpected failure (build continues): ' + (err && err.message ? err.message : err));
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
