import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('dashboard FAQ is mounted once below Submit Your Query and above the footer', () => {
  const app = source('src/App.js');
  const main = app.indexOf('<main className=');
  const homepage = app.indexOf("{page === 'home' && (", main);
  const support = app.indexOf('<section id="home-support"', homepage);
  const feedback = app.indexOf('<Feedback theme={theme} showToast={showToast} />', support);
  const faq = app.indexOf('<DashboardFAQ />', feedback);
  const mainEnd = app.indexOf('</main>', faq);
  const footer = app.indexOf('<footer', mainEnd);
  assert.ok(main >= 0 && main < homepage && homepage < support);
  assert.ok(support < feedback && feedback < faq && faq < mainEnd && mainEnd < footer);
  assert.equal(app.split('<Feedback theme={theme} showToast={showToast} />').length - 1, 1);
  assert.equal(app.split('<DashboardFAQ />').length - 1, 1);
  assert.match(app.slice(homepage, support), /<HomePage setPage={navigate}/);
  assert.match(app.slice(support, faq), /<Feedback theme={theme} showToast={showToast} \/>/);
  assert.match(app, /import DashboardFAQ from '\.\/DashboardFAQ';/);
});

test('FAQ remains an accessible native accordion without unsafe HTML or extra data writes', () => {
  const faq = source('src/DashboardFAQ.js');
  assert.match(faq, /aria-labelledby="edx-dashboard-faq-title"/);
  assert.match(faq, /id="home-faq"/);
  assert.match(faq, /<details className="edx-dashboard-faq-item" key={question} open={index === 0}>/);
  assert.match(faq, /<summary>/);
  assert.match(faq, /<p>{answer}<\/p>/);
  assert.match(faq, /<a href={href}>/);
  assert.doesNotMatch(faq, /dangerouslySetInnerHTML|eval\s*\(|addDoc\s*\(|fetch\s*\(/);
  assert.equal((faq.match(/question: '/g) || []).length, 8);
});

test('FAQ styles stay scoped, responsive and usable with keyboard in both themes', () => {
  const css = source('src/dashboard-faq.css');
  assert.match(css, /\.edx-dashboard-faq-item>summary:focus-visible/);
  assert.match(css, /\.dark \.edx-dashboard-faq/);
  assert.match(css, /@media\(max-width:580px\)/);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:html|body|nav|footer|main|\*)\s*\{/);
});

test('homepage HTML revalidates on every visit without weakening other routes', () => {
  const vercel = JSON.parse(source('vercel.json'));
  const htmlPaths = ['/', '/index.html'];
  for (const path of htmlPaths) {
    const config = vercel.headers.find(rule => rule.source === path);
    assert.ok(config, 'missing cache policy for ' + path);
    assert.match(config.headers.find(header => header.key === 'Cache-Control')?.value || '', /no-cache.*must-revalidate/);
  }
  const global = vercel.headers.find(rule => rule.source === '/(.*)');
  assert.ok(global.headers.find(header => header.key === 'Content-Security-Policy'));
  assert.ok(vercel.rewrites.some(rule => rule.source === '/vu-notes'));
});
