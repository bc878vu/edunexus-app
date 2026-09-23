import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, slugFor, resourcePath, validId } from '../api/resource-data.mjs';
import resourcePage from '../api/resource-page.mjs';
import resourceDownload from '../api/resource-download.mjs';

const file = { name: 'projects/p/databases/(default)/documents/artifacts/edunexus-live/public/data/files/abc123',
  fields: {
    name: { stringValue: 'CS101 <script>alert(1)</script> Notes' },
    subject: { stringValue: 'CS101' },
    description: { stringValue: 'Learn HTML & web safety <img src=x onerror=alert(1)>' },
    sourceType: { stringValue: 'supabase-storage' },
    storageBucket: { stringValue: 'edunexus-public-files' },
    storagePath: { stringValue: 'academic/abc123.pdf' },
    ext: { stringValue: 'pdf' }
  } };
function response() {
  return { statusCode: 200, headers: {}, body: '', location: '',
    setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
    status(code){this.statusCode=code;return this;},
    send(body){this.body=body;return this;},
    end(body=''){this.body=body;return this;},
    redirect(code,url){this.statusCode=code;this.location=url;return this;}
  };
}
test('slug and id validation cannot allow arbitrary Firestore paths', () => {
  assert.equal(slugFor('CS101 — Midterm & Quiz MCQs'), 'cs101-midterm-quiz-mcqs');
  assert.equal(resourcePath('abc123', 'CS101 Notes'), '/vu-notes/file/abc123/cs101-notes');
  assert.equal(validId('../secret'), false);
  assert.equal(validId('abc123'), true);
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});
test('resource SEO page uses escaped metadata, canonical URL, and only site links', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => String(url).includes(':runQuery')
      ? [{ document: { name: file.name + '/reviews/user123', fields: {
        comment: { stringValue: 'Genuine <b>student review</b>' },
        rating: { integerValue: '5' }, status: { stringValue: 'approved' }
      } } }] : file };
  };
  try {
    const res = response();
    const slug = slugFor(file.fields.name.stringValue);
    await resourcePage({ method:'GET', query: { id:'abc123', slug } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, /rel="canonical"/);
    assert.match(res.body, /&lt;script&gt;/);
    assert.match(res.body, /Genuine &lt;b&gt;student review&lt;\/b&gt;/);
    assert.doesNotMatch(res.body, /<img src=x onerror/);
    assert.doesNotMatch(res.body, /supabase\.co|firestore\.googleapis\.com/);
    assert.match(res.body, /\/api\/resource-download\?id=abc123/);
    assert.equal(calls.length, 3);
  } finally { global.fetch = originalFetch; }
});
test('invalid resource IDs never trigger a database or third-party fetch', async () => {
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error('unexpected network access'); };
  try {
    const res1 = response();
    await resourcePage({ method:'GET', query:{ id:'../secret', slug:'secret' } }, res1);
    assert.equal(res1.statusCode, 404);
    const res2 = response();
    await resourceDownload({ method:'GET', query:{ id:'../secret' } }, res2);
    assert.equal(res2.statusCode, 404);
  } finally { global.fetch = originalFetch; }
});
test('resource canonical slug is enforced with a permanent redirect', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ status:200, ok:true, json:async()=>file });
  try {
    const res = response();
    await resourcePage({ method:'GET', query:{id:'abc123',slug:'wrong'} },res);
    assert.equal(res.statusCode,301);
    assert.match(res.location,/^\/vu-notes\/file\/abc123\/cs101-/);
  } finally {global.fetch=originalFetch;}
});

test('file pages include responsive full navbar, genuine complete reviews and non-deceptive rating metadata', async () => {
  const originalFetch = global.fetch;
  const longReview = 'Detailed review & <not markup>. '.repeat(300);
  global.fetch = async (url) => ({
    ok: true, status: 200, json: async () => String(url).includes(':runQuery') ? [
      { document: { name: file.name + '/reviews/student1', fields: {
        comment: { stringValue: longReview }, rating: { integerValue: '4' },
        status: { stringValue: 'approved' }
      } } }
    ] : file
  });
  try {
    const res = response();
    await resourcePage({ method: 'GET', query: { id: 'abc123',
      slug: slugFor(file.fields.name.stringValue) } }, res);
    for (const label of ['Home', 'Academic Hub', 'Exam Prep', 'CGPA Calc',
      'Articles', 'Discussion', 'Portfolio', 'About', 'Contact']) {
      assert.ok(res.body.includes('>' + label + '</a>'), 'Navbar missing ' + label);
    }
    assert.match(res.body, /class="desktop-links"/);
    assert.match(res.body, /class="mobile-menu"/);
    assert.match(res.body, /aria-label="Mobile navigation"/);
    // Google does not support Review snippets on LearningResource parent nodes.
    // Keep authentic ratings in HTML without fabricating Course/Product schema.
    const schema = JSON.parse(res.body.split('<script type="application/ld+json">')[1].split('</script>')[0]);
    assert.equal(schema['@type'], 'LearningResource');
    assert.equal(schema.review, undefined);
    assert.equal(schema.aggregateRating, undefined);
    assert.match(res.body, /aria-label="4 out of 5 stars"/);
    assert.match(res.body, /Student review/);
    assert.ok(res.body.includes(escapeHtml(longReview)), 'The full review should not be truncated');
    assert.doesNotMatch(res.body, /<not markup>/);
    assert.match(res.body, /Privacy Policy/);
  } finally { global.fetch = originalFetch; }
});
test('review pages display every review via crawlable navigation, never cap to 50', async () => {
  const originalFetch = global.fetch;
  const offsets = [];
  let page = 0;
  global.fetch = async (url, options) => {
    if (!String(url).includes(':runQuery')) return { ok:true, status:200, json:async()=>file };
    const params = JSON.parse(options.body).structuredQuery;
    offsets.push(params.offset || 0);
    page += 1;
    return { ok:true, status:200, json:async()=>Array.from({ length:page === 1 ? 21 : 3 }, (_, i) => ({
      document: { name: file.name + '/reviews/student' + i, fields: {
        comment: { stringValue: 'Original reviewer comment ' + i }, rating: { integerValue:'5' },
        status: { stringValue:'approved' }
      } }
    })) };
  };
  try {
    const slug = slugFor(file.fields.name.stringValue);
    const first = response();
    await resourcePage({ method:'GET', query:{id:'abc123',slug} },first);
    assert.match(first.body,/More reviews →/);
    assert.match(first.body,/\?reviews=2/);
    assert.doesNotMatch(first.body, /"aggregateRating"/);
    const second = response();
    await resourcePage({ method:'GET',query:{id:'abc123',slug,reviews:'2'} },second);
    assert.match(second.body, /Previous reviews/);
    assert.match(second.body, /Student Reviews — Page 2/);
    assert.match(second.body, /rel="canonical" href="[^"]*\?reviews=2"/);
    assert.deepEqual(offsets,[0,20]);
  } finally { global.fetch = originalFetch; }
});
test('review page parameter is bounded before any database request', async () => {
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error('unexpected remote call'); };
  try {
    const res = response();
    await resourcePage({method:'GET', query:{id:'abc123',reviews:'9999999',slug:'anything'}},res);
    assert.equal(res.statusCode,404);
  } finally { global.fetch=originalFetch; }
});
