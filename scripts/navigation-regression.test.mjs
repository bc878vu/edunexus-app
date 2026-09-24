import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAIN_ITEMS, MOBILE_ITEMS } from '../src/site-navigation.mjs';
import { renderNavbar, navStyles } from '../api/site-shell.mjs';
import { APP_PAGES, CONTENT_PAGE_IDS, routeFromLocation, pathForPage, navActivePage } from '../src/app-routes.mjs';

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
    assert.equal((html.match(/class="site-header"/g) || []).length, 1);
    assert.equal((html.match(/aria-label="Main navigation"/g) || []).length, 1);
    assert.equal((html.match(/aria-label="Mobile navigation"/g) || []).length, 1);
    assert.match(html, /href="\/\?page=exam-prep"/);
    assert.match(html, /href="\/\?page=academic"/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /<summary aria-label="Open navigation menu">/);
  }
  assert.match(navStyles, /max-width:1279px/);
  assert.match(readFileSync('src/App.js', 'utf8'), /const ALL_ITEMS = MOBILE_ITEMS/);
  assert.match(readFileSync('api/article-page.mjs', 'utf8'), /renderNavbar\('articles'\)/);
  assert.match(readFileSync('api/learning-page.mjs', 'utf8'), /renderNavbar\('academic'\)/);
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

test('guides and tutorials render inside the shared App main and footer', () => {
  const entry = readFileSync('src/index.js', 'utf8');
  const app = readFileSync('src/App.js', 'utf8');
  const guides = readFileSync('src/ContentHub.js', 'utf8');
  const tutorials = readFileSync('src/TutorialHub.js', 'utf8');
  assert.doesNotMatch(entry, /<ContentHub\\s*\\/>|<TutorialHub\\s*\\/>/);
  assert.match(app, /CONTENT_PAGE_IDS\\.includes\\(page\\)/);
  assert.match(app, /page === 'tutorials'/);
  assert.match(app, /<ContentHub\\s*\\/>/);
  assert.match(app, /<TutorialHub\\s*\\/>/);
  assert.equal(CONTENT_PAGE_IDS.length, 8);
  assert.doesNotMatch(guides, /<main className="edux-content-main">/);
  assert.doesNotMatch(tutorials, /<main className='edux-tutorial-main'>/);
  assert.match(readFileSync('src/content-hub.css', 'utf8'),
    /\\.edux-content-overlay\\{position:relative;inset:auto;z-index:auto;overflow:visible/);
  assert.match(readFileSync('src/tutorial-hub.css', 'utf8'),
    /\\.edux-tutorial-overlay\\{position:relative;inset:auto;z-index:auto;overflow:visible/);
  assert.match(readFileSync('src/content-hub.css', 'utf8'), /\\.edux-content-nav\\{display:none\\}/);
  assert.match(readFileSync('src/tutorial-hub.css', 'utf8'), /\\.edux-tutorial-nav\\{display:none\\}/);
});

test('only content-hashed assets are eligible for service worker cache-first strategy', () => {
  const worker = readFileSync('public/sw.js', 'utf8');
  assert.match(worker, /IMMUTABLE_BUILD/);
  assert.match(worker, /if \(request\.mode === 'navigate'\)/);
  assert.match(worker, /response\.ok/);
});
