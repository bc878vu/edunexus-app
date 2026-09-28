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
  '/about', '/contact', '/privacy', '/terms', '/forum', '/tutorials', '/portfolio'
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
  const esc = escapeHtml;
  const links = [];
  const addLink = (href, label) => {
    if (href !== route.pathname) links.push({ href, label });
  };
  let kicker = 'EduNexus · Virtual University study hub';
  let h1;
  let paragraphs = [];
  if (seo.bank) {
    const { subject, termLabel } = seo.bank;
    kicker = 'EduNexus · Solved MCQ bank';
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
    kicker = 'EduNexus · Academic Hub';
    h1 = subject + ' Notes, Handouts & Past Papers';
    paragraphs = [
      'Browse ' + subject + ' study material on EduNexus: organized notes, handouts and past-paper resources for Virtual University students.',
      'Open the subject view to search files, preview documents before downloading, and read student reviews about each resource.'
    ];
    addLink('/vu-notes', 'All subjects');
    addLink('/exam-prep', 'Exam MCQ banks');
  } else if (seo.page === 'portfolio') {
    kicker = 'EduNexus · Creator';
    h1 = 'Asad Amanat Ali — Software Engineer & Web Developer';
    paragraphs = [
      'Asad Amanat Ali is a Software Engineer and the creator of EduNexus, an independent student-focused learning platform for Virtual University students.',
      'EduNexus brings together subject-wise notes and handouts, past papers, solved MCQ banks for midterm and final term exams, quizzes, a CGPA calculator and AI study tools — everything organized for exam preparation in one place.'
    ];
    addLink('/', 'Home');
    addLink('/vu-notes', 'VU notes & handouts');
    addLink('/exam-prep', 'Exam MCQ banks');
    addLink('/articles', 'Study guides & articles');
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

  // Feature cards adapt to the current route: never link to the page itself.
  const features = [
    ['/vu-notes', '&#x1F4DA;', 'VU notes & handouts', 'Subject-wise notes, handouts and past-paper resources organized by course code.'],
    ['/exam-prep', '&#x2705;', 'Exam MCQ banks', 'Solved midterm and final-term MCQs with answers for Virtual University subjects.'],
    ['/quizzes', '&#x1F9E0;', 'AI quiz generator', 'Turn any study topic into practice quizzes and test yourself in minutes.'],
    ['/cgpa-calculator', '&#x1F393;', 'CGPA calculator', 'Plan your grades semester by semester and track your academic progress.']
  ].filter(([href]) => href !== route.pathname);

  const css = '.edxp{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc}'
    + '.edxp a{text-decoration:none}'
    + '.edxp-top{display:flex;align-items:center;justify-content:space-between;max-width:1060px;margin:0 auto;padding:14px 20px}'
    + '.edxp-logo{font-weight:800;font-size:1.25rem;color:#4f46e5}'
    + '.edxp-nav{display:flex;gap:18px;font-size:.9rem}'
    + '.edxp-nav a{color:#475569;font-weight:600}'
    + '.edxp-nav a:hover{color:#4f46e5}'
    + '.edxp-hero{position:relative;overflow:hidden;background:linear-gradient(120deg,#4f46e5,#7c3aed,#a855f7,#4f46e5);background-size:300% 300%;animation:edxpShift 16s ease infinite;color:#fff;padding:64px 20px 72px;text-align:center}'
    + '.edxp-blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;pointer-events:none;animation:edxpFloat 9s ease-in-out infinite}'
    + '.edxp-blob.b1{width:340px;height:340px;background:#f472b6;top:-120px;left:-100px}'
    + '.edxp-blob.b2{width:300px;height:300px;background:#38bdf8;bottom:-140px;right:-80px;animation-delay:-4.5s}'
    + '@keyframes edxpShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}'
    + '@keyframes edxpFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-26px) scale(1.06)}}'
    + '.edxp-hero-inner{position:relative;z-index:1;max-width:780px;margin:0 auto}'
    + '.edxp-hero-inner>*{animation:edxpUp .7s cubic-bezier(.2,.7,.3,1) both}'
    + '.edxp-hero-inner>*:nth-child(2){animation-delay:.08s}.edxp-hero-inner>*:nth-child(3){animation-delay:.16s}.edxp-hero-inner>*:nth-child(4){animation-delay:.24s}.edxp-hero-inner>*:nth-child(5){animation-delay:.32s}'
    + '@keyframes edxpUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'
    
    + '.edxp-kicker{display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);padding:6px 16px;border-radius:999px;font-size:.78rem;font-weight:700;letter-spacing:.05em;margin:0 0 20px;text-transform:uppercase}'
    + '.edxp-hero h1{font-size:2.15rem;line-height:1.2;margin:0 0 16px}'
    + '.edxp-hero p{margin:0 auto 10px;max-width:660px;color:#ede9fe;line-height:1.75;font-size:1.02rem}'
    + '.edxp-cta{margin:26px 0 20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}'
    + '.edxp-cta a{padding:13px 26px;border-radius:12px;font-weight:700;font-size:.95rem;transition:transform .15s ease}'
    + '.edxp-cta a:hover{transform:translateY(-2px)}'
    + '.edxp-cta .p{background:#fff;color:#4f46e5}'
    + '.edxp-cta .s{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.4)}'
    + '.edxp-load{display:inline-flex;align-items:center;gap:10px;font-size:.9rem;color:#ede9fe;margin:0;font-weight:600}'
    + '.edxp-stats{display:flex;gap:30px;justify-content:center;flex-wrap:wrap;margin:28px 0 4px}'
    + '.edxp-stats div{text-align:center}'
    + '.edxp-stats strong{display:block;font-size:1.55rem;letter-spacing:-.01em}'
    + '.edxp-stats span{font-size:.72rem;color:#ddd6fe;text-transform:uppercase;letter-spacing:.08em;font-weight:700}'
    + '.edxp-bar{width:min(320px,72%);height:4px;background:rgba(255,255,255,.25);border-radius:99px;margin:16px auto 0;overflow:hidden}'
    + '.edxp-bar i{display:block;height:100%;width:38%;border-radius:99px;background:#fff;animation:edxpBar 1.5s ease-in-out infinite}'
    + '@keyframes edxpBar{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}'
    + '.edxp-tip{font-size:.84rem;color:#ddd6fe;margin:12px auto 0;min-height:1.5em;max-width:520px}'
    + '.edxp-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:edxpSpin .9s linear infinite}'
    + '@keyframes edxpSpin{to{transform:rotate(360deg)}}'
    + '.edxp-sec{max-width:1060px;margin:0 auto;padding:44px 20px 8px}'
    + '.edxp-sec h2{font-size:1.4rem;margin:0 0 8px}'
    + '.edxp-sub{color:#64748b;margin:0 0 22px;line-height:1.6}'
    + '.edxp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}'
    + '.edxp-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;transition:box-shadow .2s ease,transform .2s ease;animation:edxpUp .6s ease both}'
    + '.edxp-grid>*:nth-child(2){animation-delay:.08s}.edxp-grid>*:nth-child(3){animation-delay:.16s}.edxp-grid>*:nth-child(4){animation-delay:.24s}'
    + '.edxp-card:hover{box-shadow:0 12px 28px -12px rgba(79,70,229,.25);transform:translateY(-3px)}'
    + '.edxp-card .ic{font-size:1.7rem}'
    + '.edxp-card h3{margin:12px 0 8px;font-size:1.03rem}'
    + '.edxp-card h3 a{color:#0f172a}'
    + '.edxp-card h3 a:hover{color:#4f46e5}'
    + '.edxp-card p{margin:0;color:#64748b;font-size:.9rem;line-height:1.65}'
    + '.edxp-pills{display:flex;flex-wrap:wrap;gap:10px}'
    + '.edxp-pills a{background:#eef2ff;color:#4f46e5;font-weight:600;font-size:.88rem;padding:10px 18px;border-radius:999px;border:1px solid #e0e7ff}'
    + '.edxp-pills a:hover{background:#4f46e5;color:#fff;border-color:#4f46e5}'
    + '.edxp-foot{border-top:1px solid #e2e8f0;padding:26px 20px 40px;text-align:center;color:#94a3b8;font-size:.82rem;max-width:1060px;margin:34px auto 0}'
    + '@media(prefers-color-scheme:dark){.edxp{color:#e2e8f0;background:#0b1120}.edxp-sec h2{color:#f1f5f9}.edxp-sub{color:#94a3b8}.edxp-card{background:#111c33;border-color:#223052}.edxp-card h3 a{color:#f1f5f9}.edxp-card p{color:#94a3b8}.edxp-pills a{background:#1e1b4b;border-color:#312e81;color:#c7d2fe}.edxp-foot{border-color:#223052;color:#64748b}.edxp-nav a{color:#94a3b8}.edxp-logo{color:#a5b4fc}}'
    + '@media(max-width:720px){.edxp-nav{display:none}}'
    + '@media(max-width:640px){.edxp-hero{padding:48px 16px 56px}.edxp-hero h1{font-size:1.6rem}.edxp-hero p{font-size:.95rem}.edxp-sec{padding:32px 16px 4px}.edxp-cta{flex-direction:column;align-items:stretch}.edxp-cta a{text-align:center}.edxp-stats{gap:18px}.edxp-stats strong{font-size:1.3rem}}';

  const featureCards = features.map(([href, icon, title, body]) =>
    '<article class="edxp-card"><div class="ic" aria-hidden="true">' + icon + '</div><h3><a href="' + esc(href) + '">' + esc(title) + '</a></h3><p>' + esc(body) + '</p></article>'
  ).join('');
  const statItems = banks.length
    ? [[String(banks.length), 'solved MCQ banks'], ['4', 'study tools'], ['100% free', 'for VU students']]
    : [['4', 'study tools'], ['8', 'semesters covered'], ['100% free', 'for VU students']];
  const stats = statItems.map(([num, label]) => '<div><strong>' + esc(num) + '</strong><span>' + esc(label) + '</span></div>').join('');
  const tipScript = '<script>(function(){var tips=["Tip: revise MCQs in short daily sessions instead of one long cram.","Tip: read paper reviews to spot repeated topics before exams.","Tip: use the CGPA calculator to plan the grades you need this semester.","Tip: preview a file before downloading to check it is the right one."];var el=document.getElementById("edxp-tip");if(!el)return;var i=0;setInterval(function(){i=(i+1)%tips.length;el.textContent=tips[i];},3200);})();</script>';
  const pills = links.map(({ href, label }) =>
    '<a href="' + esc(href) + '">' + esc(label) + '</a>'
  ).join('');

  return '<div class="edxp"><style>' + css + '</style>'
    + '<header class="edxp-top"><a class="edxp-logo" href="/">&#x1F393; EduNexus</a>'
    + '<nav class="edxp-nav" aria-label="Primary"><a href="/vu-notes">VU Notes</a><a href="/exam-prep">MCQ Banks</a><a href="/quizzes">Quizzes</a><a href="/cgpa-calculator">CGPA Calculator</a></nav></header>'
    + '<main><section class="edxp-hero"><div class="edxp-blob b1" aria-hidden="true"></div><div class="edxp-blob b2" aria-hidden="true"></div><div class="edxp-hero-inner">'
    + '<p class="edxp-kicker">' + esc(kicker) + '</p>'
    + '<h1>' + esc(h1) + '</h1>'
    + paragraphs.map((p) => '<p>' + esc(p) + '</p>').join('')
    + '<div class="edxp-cta"><a class="p" href="/vu-notes">Browse VU notes</a><a class="s" href="/exam-prep">MCQ banks</a></div>'
    + '<div class="edxp-stats">' + stats + '</div>'
    + '<p class="edxp-load"><span class="edxp-spin" aria-hidden="true"></span> Loading the interactive app…</p>'
    + '<div class="edxp-bar" aria-hidden="true"><i></i></div>'
    + '<p class="edxp-tip" id="edxp-tip">Tip: revise MCQs in short daily sessions instead of one long cram.</p>'
    + '</div></section>'
    + '<section class="edxp-sec" aria-label="Study tools"><h2>Everything for VU exam prep, in one place</h2><p class="edxp-sub">Notes, practice questions, quizzes and planning tools built for Virtual University students.</p><div class="edxp-grid">' + featureCards + '</div></section>'
    + (pills ? '<section class="edxp-sec" aria-label="Related pages"><h2>Related pages</h2><div class="edxp-pills">' + pills + '</div></section>' : '')
    + '</main><footer class="edxp-foot">EduNexus is an independent student resource platform, not an official Virtual University service.</footer></div>' + tipScript;
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
  let jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': seo.schemaType,
    name: seo.title.split('|')[0].trim(), url: seo.canonical, description: seo.description,
    isPartOf: { '@type': 'WebSite', name: 'EduNexus', url: SITE }
  }).replace(/</g, '\\u003c');
  // Portfolio page: full ProfilePage + Person structured data for the profile.
  if (seo.page === 'portfolio') {
    jsonLd = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ProfilePage',
      name: seo.title.split('|')[0].trim(), url: seo.canonical, description: seo.description,
      mainEntity: {
        '@type': 'Person', name: 'Asad Amanat Ali', url: seo.canonical,
        jobTitle: 'Software Engineer',
        description: 'Software Engineer and creator of EduNexus, a student study and exam preparation platform for Virtual University students.',
        knowsAbout: ['Web Development', 'Software Engineering', 'Education Technology']
      },
      isPartOf: { '@type': 'WebSite', name: 'EduNexus', url: SITE }
    }).replace(/</g, '\\u003c');
  }
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
