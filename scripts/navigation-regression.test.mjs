import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAIN_ITEMS, MOBILE_ITEMS } from '../src/site-navigation.mjs';
import { renderNavbar, renderFooter, renderThemeToggle, shellThemeBoot, navStyles } from '../api/site-shell.mjs';
import { APP_PAGES, CONTENT_PAGE_IDS, routeFromLocation, pathForPage, navActivePage, routeParamsFromPath } from '../src/app-routes.mjs';
import { SITE, canonicalPath } from '../src/site-seo.mjs';

test('all nine principal destinations are shared by desktop and mobile nav', () => {
  assert.equal(MAIN_ITEMS.length, 9);
  assert.equal(new Set(MAIN_ITEMS.map((item) => item.id)).size, MAIN_ITEMS.length);
  assert.deepEqual(MAIN_ITEMS.map((item) => item.id), [
    'home', 'academic', 'exam-prep', 'cgpa', 'articles',
    'forum', 'portfolio', 'about', 'contact'
  ]);
  MAIN_ITEMS.forEach((item) => {
    assert.equal(MOBILE_ITEMS.find((mobile) => mobile.id === item.id)?.href, item.href);
    assert.ok(item.href.startsWith('/'));
    assert.ok(item.label);
  });
});

test('resource, guide and article SSR pages have a single accessible main nav', () => {
  for (const active of ['academic', 'articles']) {
    const html = renderNavbar(active);
    assert.equal((html.match(/id="edunexus-main-navbar"/g) || []).length, 1);
    assert.equal((html.match(/data-edunexus-main-nav="true"/g) || []).length, 1);
    assert.equal((html.match(/class="site-header"/g) || []).length, 1);
    assert.equal((html.match(/aria-label="Main navigation"/g) || []).length, 1);
    assert.equal((html.match(/aria-label="Mobile navigation"/g) || []).length, 1);
    assert.match(html, /href="\/\?page=exam-prep"/);
    assert.match(html, /href="\/\?page=academic"/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /<summary aria-label="Open navigation menu">/);
  }
  assert.match(navStyles, /max-width:1279px/);
  const appSource = readFileSync('src/App.js', 'utf8');
  assert.match(appSource, /const ALL_ITEMS = MOBILE_ITEMS/);
  assert.equal((appSource.match(/<Navbar\b/g) || []).length, 1);
  assert.equal((appSource.match(/id="edunexus-main-navbar"/g) || []).length, 1);
  assert.equal((appSource.match(/data-edunexus-main-nav="true"/g) || []).length, 1);
  assert.match(readFileSync('api/article-page.mjs', 'utf8'), /renderNavbar\('articles'\)/);
  assert.match(readFileSync('api/learning-page.mjs', 'utf8'), /renderNavbar\('academic'\)/);
});

test('SPA and SSR navbar keep the same centered desktop geometry', () => {
  const app = readFileSync('src/App.js', 'utf8');
  assert.match(app, /xl:grid xl:grid-cols-\[minmax\(240px,1fr\)_auto_minmax\(240px,1fr\)\]/);
  assert.match(app, /xl:justify-self-center/);
  assert.match(app, /xl:justify-self-end min-w-\[88px\]/);
  assert.match(navStyles, /grid-template-columns:minmax\(240px,1fr\) auto minmax\(240px,1fr\)/);
  assert.match(navStyles, /min-height:60px/);
  assert.match(navStyles, /\.desktop-account\{justify-self:end;min-width:88px/);
  const html = renderNavbar('articles');
  assert.match(html, /<div class="desktop-account"[^>]*><span>Hi, Dear<\/span><\/div>/);
});

test('SPA and standalone pages share one stable app footer and theme shell', () => {
  const app = readFileSync('src/App.js', 'utf8');
  const footer = renderFooter();
  assert.equal((app.match(/id="edunexus-main-footer"/g) || []).length, 1);
  assert.equal((app.match(/data-edunexus-main-footer="true"/g) || []).length, 1);
  assert.equal((footer.match(/id="edunexus-main-footer"/g) || []).length, 1);
  assert.equal((footer.match(/data-edunexus-main-footer="true"/g) || []).length, 1);
  assert.match(footer, /Study updates &amp; bug report\?/);
  assert.match(footer, /MCQ Bank &amp; Paper Reviews/);
  assert.match(renderThemeToggle(), /data-shell-theme-toggle/);
  assert.match(shellThemeBoot, /localStorage\.getItem\("theme"\)/);
  assert.match(shellThemeBoot, /data-shell-image-lightbox/);
  assert.match(navStyles, /\.site-image-lightbox\{position:fixed;inset:0;z-index:200/);
  assert.match(navStyles, /body\{min-height:100vh;display:flex;flex-direction:column\}/);
  assert.match(navStyles, /\.site-footer\{width:100%;max-width:none!important/);
  for (const path of ['api/article-page.mjs', 'api/resource-page.mjs', 'api/learning-page.mjs']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /renderFooter\(\)/);
    assert.match(source, /renderThemeToggle\(\)/);
    assert.match(source, /shellThemeBoot/);
    assert.doesNotMatch(source, /<footer class="site-footer">/);
  }
});

test('direct and legacy page URLs resolve to one application route', () => {
  const direct = ['/study-guides', '/vu-notes-guide', '/past-papers-guide',
    '/exam-preparation', '/cgpa-guide', '/ai-study-tools',
    '/student-resources', '/live-projects', '/tutorials'];
  for (const path of direct) {
    const page = routeFromLocation(new URL(path, 'https://example.test'));
    assert.ok(APP_PAGES.includes(page));
    assert.notEqual(page, 'home');
    assert.equal(routeFromLocation(new URL(pathForPage(page), 'https://example.test')), page);
  }
  assert.equal(routeFromLocation(new URL('/?page=academic&file=abc', 'https://example.test')), 'academic');
  assert.equal(routeFromLocation(new URL('/?page=exam-prep&section=reviews', 'https://example.test')), 'exam-prep');
  assert.equal(routeFromLocation(new URL('/?page=unknown', 'https://example.test')), 'home');
  assert.equal(navActivePage('guides'), 'academic');
  assert.equal(navActivePage('tutorials'), 'academic');
  assert.equal(navActivePage('projects'), 'portfolio');
});

test('pretty parameterized routes resolve and ?page= keeps precedence', () => {
  const loc = (pathname, search = '') => ({ pathname, search });
  // /academic/<subject>
  assert.deepEqual(routeParamsFromPath('/academic/CS609_System_Programming'),
    { page: 'academic', subject: 'CS609_System_Programming', term: '' });
  assert.equal(routeFromLocation(loc('/academic/CS609_System_Programming')), 'academic');
  // /exam-prep/<subject>/<term>
  assert.deepEqual(routeParamsFromPath('/exam-prep/CS609/Finalterm'),
    { page: 'exam-prep', subject: 'CS609', term: 'Finalterm' });
  assert.equal(routeFromLocation(loc('/exam-prep/CS609/Finalterm')), 'exam-prep');
  assert.equal(routeFromLocation(loc('/exam-prep/CS101/Midterm')), 'exam-prep');
  // ?page= takes precedence over the pretty path, exactly as before
  assert.equal(routeFromLocation(loc('/exam-prep/CS609/Finalterm', '?page=academic')), 'academic');
  assert.equal(routeFromLocation(loc('/academic/CS609', '?page=exam-prep')), 'exam-prep');
  assert.equal(routeFromLocation(loc('/exam-prep/CS609/Finalterm', '?page=unknown')), 'exam-prep');
  // non-parameterized pretty paths are untouched
  assert.deepEqual(routeParamsFromPath('/quizzes'), { page: '', subject: '', term: '' });
  assert.deepEqual(routeParamsFromPath('/exam-prep'), { page: '', subject: '', term: '' });
  assert.equal(routeFromLocation(loc('/exam-prep')), 'exam-prep');
  assert.equal(routeFromLocation(loc('/quizzes')), 'aiquiz');
  assert.equal(routeFromLocation(loc('/no-such-page')), 'home');
  assert.equal(routeFromLocation(loc('/exam-prep/CS609')), 'home');
});

test('canonical URLs use the pretty path forms', () => {
  assert.equal(SITE, 'https://edunexus.dpdns.org');
  assert.equal(canonicalPath('exam-prep', '?subject=CS609&term=Finalterm'), '/exam-prep/CS609/Finalterm');
  assert.equal(canonicalPath('exam-prep', '?subject=cs101&term=midterm'), '/exam-prep/CS101/Midterm');
  assert.equal(canonicalPath('exam-prep', ''), '/exam-prep');
  assert.equal(canonicalPath('exam-prep', '', { subject: 'CS609', term: 'Finalterm' }), '/exam-prep/CS609/Finalterm');
  assert.equal(canonicalPath('academic', '?subject=CS609_System_Programming'), '/academic/CS609_System_Programming');
  assert.equal(canonicalPath('academic', '', { subject: 'CS609_System_Programming' }), '/academic/CS609_System_Programming');
  assert.equal(canonicalPath('academic', ''), '/vu-notes');
  // legacy query behavior for non-parameterized pages is unchanged
  assert.equal(canonicalPath('admin', ''), '/?page=admin');
  assert.equal(canonicalPath('contact', ''), '/contact');
  assert.equal(canonicalPath('home', ''), '/');
  assert.equal(canonicalPath('nope', ''), '/');
});

test('sitemap advertises the pretty canonical URLs', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  assert.match(sitemap, /<loc>https:\/\/edunexus\.dpdns\.org\/exam-prep\/CS609\/Finalterm<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/edunexus\.dpdns\.org\/exam-prep<\/loc>/);
  assert.doesNotMatch(sitemap, /\?page=exam-prep/);
  assert.doesNotMatch(sitemap, /edunexus-app\.vercel\.app/);
});

test('guides and tutorials render inside the shared App main and footer', () => {
  const entry = readFileSync('src/index.js', 'utf8');
  const app = readFileSync('src/App.js', 'utf8');
  const guides = readFileSync('src/ContentHub.js', 'utf8');
  const tutorials = readFileSync('src/TutorialHub.js', 'utf8');
  const adminContent = readFileSync('src/AdminContentManager.js', 'utf8');
  assert.doesNotMatch(entry, /<ContentHub\s*\/>|<TutorialHub\s*\/>/);
  assert.match(app, /CONTENT_PAGE_IDS\.includes\(page\)/);
  assert.match(app, /page === 'tutorials'/);
  assert.match(app, /<ContentHub\s*\/>/);
  assert.match(app, /<TutorialHub\s*\/>/);
  assert.equal(CONTENT_PAGE_IDS.length, 8);
  assert.doesNotMatch(guides, /edux-content-nav/);
  assert.doesNotMatch(tutorials, /edux-tutorial-nav/);
  assert.doesNotMatch(adminContent, /edx-admin-header/);
  assert.doesNotMatch(guides, /<main className="edux-content-main">/);
  assert.doesNotMatch(tutorials, /<main className='edux-tutorial-main'>/);
  assert.match(readFileSync('src/content-hub.css', 'utf8'),
    /\.edux-content-overlay\{position:relative;inset:auto;z-index:auto;overflow:visible/);
  assert.match(readFileSync('src/tutorial-hub.css', 'utf8'),
    /\.edux-tutorial-overlay\{position:relative;inset:auto;z-index:auto;overflow:visible/);
  assert.match(readFileSync('src/content-hub.css', 'utf8'), /\.edux-content-nav\{display:none!important\}/);
  assert.match(readFileSync('src/tutorial-hub.css', 'utf8'), /\.edux-tutorial-nav\{display:none!important\}/);
  assert.match(readFileSync('src/admin-content-manager.css', 'utf8'), /\.edx-tutorials-embedded \.edx-admin-header\{display:none!important\}/);
});

test('moving resource orb stays mounted with the managed page links', () => {
  const enhancer = readFileSync('src/DashboardEnhancerSafe.js', 'utf8');
  assert.match(enhancer, /<FloatingResourceButton hidden=\{page === 'admin'\} \/>/);
  assert.match(enhancer, /getMetaDoc\('floatingHub'\)/);
  assert.match(enhancer, /subscribeMetaDoc\('floatingHub'/);
  for (const label of ['Study Guides', 'Tutorial Videos', 'Student Resources', 'Live Projects']) {
    assert.match(enhancer, new RegExp(label));
  }
  assert.match(enhancer, /dashboardPinned/);
  assert.doesNotMatch(enhancer, /Orb removed/);
});

test('article covers use the enhanced full-frame treatment', () => {
  const articleList = readFileSync('src/ArticlesPage.js', 'utf8');
  const articlePage = readFileSync('api/article-page.mjs', 'utf8');
  assert.match(articleList, /w-full h-52 sm:h-64 md:h-80 lg:h-\[360px\]/);
  assert.match(articleList, /style=\{\{ width: '100%' \}\}/);
  assert.match(articleList, /absolute inset-0 w-full h-full object-cover object-\[center_28%\]/);
  assert.match(articleList, /articleImageSrcSet/);
  assert.match(articleList, /q_auto:good,c_limit,w_/);
  assert.match(articleList, /896px/);
  assert.match(articleList, /group-hover:scale-\[1\.035\]/);
  assert.match(articleList, /View full image/);
  assert.match(articlePage, /v9-unified-shell-enhanced-images/);
  assert.match(articlePage, /height:clamp\(260px,46vw,520px\)/);
  assert.match(articlePage, /object-fit:cover;object-position:center 30%/);
  assert.match(articlePage, /articleImageSrcSet/);
  assert.match(articlePage, /class="article-cover-action"/);
  assert.match(articlePage, /data-shell-image-lightbox/);
});

test('only content-hashed assets are eligible for service worker cache-first strategy', () => {
  const worker = readFileSync('public/sw.js', 'utf8');
  assert.match(worker, /IMMUTABLE_BUILD/);
  assert.match(worker, /if \(request\.mode === 'navigate'\)/);
  assert.match(worker, /response\.ok/);
});

test('prerender writes per-route static HTML from the sitemap without touching the repo build', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { prerender } = await import('./prerender.mjs');
  const stub = mkdtempSync(join(tmpdir(), 'edunexus-prerender-'));
  mkdirSync(join(stub, 'build'), { recursive: true });
  mkdirSync(join(stub, 'public'), { recursive: true });
  const template = '<!doctype html><html lang="en"><head><meta charset="utf-8"/>'
    + '<title>Old Title</title><meta name="description" content="Old desc"/>'
    + '<meta name="keywords" content="old"/>'
    + '<meta name="robots" content="index, follow"/>'
    + '<link rel="canonical" href="https://old.example/"/>'
    + '<meta property="og:title" content="Old Title"/><meta property="og:description" content="Old desc"/>'
    + '<meta property="og:url" content="https://old.example/"/><meta property="og:image" content="https://old.example/logo512.png"/>'
    + '<meta name="twitter:title" content="Old Title"/><meta name="twitter:description" content="Old desc"/>'
    + '<meta name="twitter:image" content="https://old.example/logo512.png"/>'
    + '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script>'
    + '</head><body><div id="root"></div><script src="/static/js/main.js"></script></body></html>';
  writeFileSync(join(stub, 'build', 'index.html'), template, 'utf8');
  writeFileSync(join(stub, 'public', 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + '<url><loc>https://edunexus.dpdns.org/</loc></url>'
    + '<url><loc>https://edunexus.dpdns.org/exam-prep/CS609/Finalterm</loc></url>'
    + '<url><loc>https://edunexus.dpdns.org/academic/CS609_System_Programming</loc></url>'
    + '<url><loc>https://edunexus.dpdns.org/learning/cs101/some-slug</loc></url>'
    + '</urlset>', 'utf8');

  const { written, routes } = await prerender(stub);
  assert.ok(written > 0);
  assert.ok(routes.includes('/exam-prep/CS609/Finalterm'));
  assert.ok(routes.includes('/academic/CS609_System_Programming'));
  assert.ok(!routes.includes('/learning/cs101/some-slug'));

  const bankHtml = readFileSync(join(stub, 'build', 'exam-prep', 'CS609', 'Finalterm', 'index.html'), 'utf8');
  assert.match(bankHtml, /<title>CS609 Final Term Solved MCQs \| EduNexus<\/title>/);
  assert.match(bankHtml, /<link rel="canonical" href="https:\/\/edunexus\.dpdns\.org\/exam-prep\/CS609\/Finalterm"\/>/);
  assert.match(bankHtml, /<div id="root"><main class="edx-prerender-static"/);
  assert.match(bankHtml, /<h1[^>]*>CS609 Final Term Solved MCQs<\/h1>/);
  assert.equal((bankHtml.match(/<script type="application\/ld\+json">/g) || []).length, 1);
  assert.match(bankHtml, /"@type":"WebApplication"/);

  const academicHtml = readFileSync(join(stub, 'build', 'academic', 'CS609_System_Programming', 'index.html'), 'utf8');
  assert.match(academicHtml, /<title>CS609 SYSTEM PROGRAMMING Notes, Handouts &amp; Past Papers \| EduNexus<\/title>/);
  assert.match(academicHtml, /<link rel="canonical" href="https:\/\/edunexus\.dpdns\.org\/academic\/CS609_System_Programming"\/>/);

  const homeHtml = readFileSync(join(stub, 'build', 'index.html'), 'utf8');
  assert.match(homeHtml, /<link rel="canonical" href="https:\/\/edunexus\.dpdns\.org\/"\/>/);
  assert.doesNotMatch(homeHtml, /old\.example/);
  assert.ok(existsSync(join(stub, 'build', 'exam-prep', 'index.html')));

  // Missing build dir: must not throw and must report zero writes.
  const empty = mkdtempSync(join(tmpdir(), 'edunexus-prerender-empty-'));
  const skipped = await prerender(empty);
  assert.equal(skipped.written, 0);
});
