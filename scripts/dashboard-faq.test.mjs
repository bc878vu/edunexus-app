import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('dashboard FAQ is mounted once below Submit Your Query and above the footer', () => {
  const app = source('src/App.js');
  const feedback = app.indexOf('<Feedback theme={theme} showToast={showToast} />');
  const faq = app.indexOf('<DashboardFAQ />');
  const footer = app.indexOf('<footer', faq);
  assert.ok(feedback >= 0 && feedback < faq && faq < footer);
  assert.equal(app.split('<DashboardFAQ />').length - 1, 1);
  assert.ok(app.includes("page === 'home' && ("));
  assert.match(app, /import DashboardFAQ from '\.\/DashboardFAQ';/);
});

test('FAQ remains an accessible native accordion without unsafe HTML or extra data writes', () => {
  const faq = source('src/DashboardFAQ.js');
  assert.match(faq, /aria-labelledby="edx-dashboard-faq-title"/);
  assert.match(faq, /<details className="edx-dashboard-faq-item"/);
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
