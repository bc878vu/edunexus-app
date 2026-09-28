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
  } else if (seo.page === 'portfolio') {
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
  const linkHtml = links.length
    ? '<nav aria-label="Related pages"><p>Related: ' + links.join(' · ') + '</p></nav>'
    : '';
  return '<main class="edx-prerender-static" style="max-width:900px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.7">'
    + '<p style="margin:0 0 8px"><a href="/" style="font-weight:700;color:#4f46e5;text-decoration:none">EduNexus</a></p>'
    + '<h1 style="font-size:2rem;line-height:1.25;margin:0 0 16px">' + escapeHtml(h1) + '</h1>'
    + paragraphs.map((p) => '<p style="margin:0 0 12px">' + escapeHtml(p) + '</p>').join('')
    + linkHtml
    + '</main>';
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
