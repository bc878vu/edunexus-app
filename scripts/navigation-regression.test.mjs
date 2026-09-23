import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAIN_ITEMS, MOBILE_ITEMS } from '../src/site-navigation.mjs';
import { renderNavbar, navStyles } from '../api/site-shell.mjs';

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

test('content overlays no longer obscure the shared navbar', () => {
  for (const [file, selector] of [
    ['src/content-hub.css', 'edux-content-nav'],
    ['src/tutorial-hub.css', 'edux-tutorial-nav']
  ]) {
    const css = readFileSync(file, 'utf8');
    assert.match(css, new RegExp('\\.' + selector + '\\{display:none\\}'));
    assert.match(css, /inset:70px 0 0;z-index:40/);
  }
});

test('only content-hashed assets are eligible for service worker cache-first strategy', () => {
  const worker = readFileSync('public/sw.js', 'utf8');
  assert.match(worker, /IMMUTABLE_BUILD/);
  assert.match(worker, /if \(request\.mode === 'navigate'\)/);
  assert.match(worker, /response\.ok/);
});
