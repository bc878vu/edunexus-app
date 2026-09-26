import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_PAGES, routeFromLocation } from '../src/app-routes.mjs';
import { SITE, canonicalPath, canonicalUrl, seoPageFromLocation } from '../src/site-seo.mjs';
import { SITE as SERVER_SITE } from '../api/resource-data.mjs';

const text = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('one canonical origin is shared by client, SSR and static metadata', () => {
  assert.equal(SITE, 'https://edunexus-app.vercel.app');
  assert.equal(SERVER_SITE, SITE);
  const seo = text('src/SEO.js');
  const app = text('src/App.js');
  const entry = text('src/index.js');
  assert.match(seo, /from ["']\.\/site-seo\.mjs["']/);
  assert.match(entry, /<SEOManager \/>/);
  assert.equal((entry.match(/<SEOManager\s*\/>/g) || []).length, 1);
  assert.doesNotMatch(app, /document\.title\s*=|canonical\.href\s*=|edx-portfolio-schema/);
  assert.match(seo, /document\.title\s*=/);
  assert.match(seo, /setMeta\('description'/);
  assert.match(seo, /link\.href\s*=\s*canonical/);
  assert.match(seo, /edx-portfolio-schema/);
  assert.match(seo, /"exam-prep":\s*\[/);
});

test('every App page has a stable canonical URL that loads the same content page', () => {
  for (const page of APP_PAGES) {
    const url = canonicalUrl(page);
    const parsed = new URL(url);
    assert.equal(parsed.origin, SITE, 'origin of ' + page);
    assert.equal(parsed.pathname + parsed.search, canonicalPath(page));
    assert.equal(routeFromLocation(parsed), page, 'direct canonical loads ' + page);
    assert.equal(seoPageFromLocation(parsed), page, 'SEO reads the same page as App: ' + page);
  }
  assert.equal(canonicalUrl('unknown'), SITE + '/');
  assert.equal(canonicalUrl('academic'), SITE + '/vu-notes');
  assert.equal(canonicalUrl('aiquiz'), SITE + '/quizzes');
  assert.equal(canonicalUrl('portfolio'), SITE + '/portfolio');
  assert.equal(canonicalUrl('exam-prep'), SITE + '/exam-prep');
  assert.equal(canonicalUrl('flashcards'), SITE + '/?page=flashcards');
});

test('legacy query URLs, aliases and browser history use the correct SEO record', () => {
  assert.equal(seoPageFromLocation(new URL(SITE + '/?page=exam-prep')), 'exam-prep');
  assert.equal(seoPageFromLocation(new URL(SITE + '/?page=portfolio')), 'portfolio');
  assert.equal(seoPageFromLocation(new URL(SITE + '/handouts')), 'academic');
  assert.equal(seoPageFromLocation(new URL(SITE + '/past-papers')), 'academic');
  assert.equal(seoPageFromLocation(new URL(SITE + '/ai-tools')), 'aiquiz');
  assert.equal(canonicalUrl('planner'), SITE + '/?page=planner');
});

test('all static sitemap and robots URLs use the same canonical origin', () => {
  const sitemap = text('public/sitemap.xml');
  const robots = text('public/robots.txt');
  const index = text('public/index.html');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(urls.length > 15);
  for (const url of urls) assert.equal(new URL(url).origin, SITE, url);
  assert.ok(urls.includes(SITE + '/portfolio'));
  assert.match(sitemap, /edunexus-app\.vercel\.app/);
  assert.doesNotMatch(sitemap, /edunexus\.dpdns\.org/);
  assert.match(robots, /Sitemap: https:\/\/edunexus-app\.vercel\.app\/sitemap\.xml/);
  assert.match(index, /property="og:url" content="https:\/\/edunexus-app\.vercel\.app\/"/);
});

test('all friendly canonical routes can be opened directly on Vercel', () => {
  const vercel = JSON.parse(text('vercel.json'));
  const rewrites = new Map(vercel.rewrites.map(rule => [rule.source, rule.destination]));
  const friendly = ['academic', 'articles', 'aiquiz', 'cgpa', 'forum', 'portfolio', 'privacy', 'terms',
    'guides', 'vu-notes-guide', 'past-papers', 'exam-preparation', 'cgpa-guide',
    'ai-study-tools', 'resources', 'projects', 'tutorials'];
  for (const page of friendly) {
    const path = canonicalPath(page);
    assert.equal(rewrites.get(path), '/index.html', page + ' missing direct route');
    assert.equal(routeFromLocation(new URL(SITE + path)), page);
  }
});
