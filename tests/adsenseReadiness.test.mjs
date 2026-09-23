import test from 'node:test';
import assert from 'node:assert/strict';
import guidePage from '../api/learning-page.mjs';
import articlePage from '../api/article-page.mjs';
import articleSitemap from '../api/article-sitemap.mjs';
import { SUBJECT_GUIDES, GUIDE_CODES, guideForFile } from '../api/subject-guides.mjs';
import { articlePath, SITE } from '../api/resource-data.mjs';
import { readFileSync } from 'node:fs';

function response(){
  return {statusCode:200,headers:{},body:'',location:'',
    setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
    status(code){this.statusCode=code;return this;},
    send(body){this.body=body;return this;},
    end(body=''){this.body=body;return this;},
    redirect(code,url){this.statusCode=code;this.location=url;return this;}
  };
}
const slug=(value)=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
test('all authored course guides have worked examples and standalone readable canonical pages',()=>{
  assert.equal(GUIDE_CODES.length,6);
  assert.equal(guideForFile({name:'HRM613 midterm.pdf',subject:'General'}),'HRM613');
  assert.equal(guideForFile({name:'unrelated.pdf',subject:'MGT611'}),null);
  for(const code of GUIDE_CODES){
    const guide=SUBJECT_GUIDES[code];
    assert.ok(guide.intro.length>100);
    assert.equal(guide.sections.length,4);
    const res=response();
    guidePage({method:'GET',query:{code:code.toLowerCase(),slug:slug(guide.title)}},res);
    assert.equal(res.statusCode,200);
    assert.match(res.body,/<h1>/);
    assert.match(res.body,/rel="canonical"/);
    assert.match(res.body,/aria-label="Mobile navigation"/);
    assert.ok(res.body.includes(guide.sections[3].text.replace(/&/g,'&amp;')));
    assert.match(res.body,/current syllabus/);
  }
});
test('article route renders real stored text without active markup injection',async()=>{
  const fetchBefore=global.fetch;
  const record={name:'projects/p/databases/(default)/documents/artifacts/edunexus-live/public/data/articles/abc123',
    fields:{title:{stringValue:'How to study <script>alert(1)</script>'},
      content:{stringValue:('Original worked example & <img src=x onerror=alert(1)>; '.repeat(25))},
      createdAt:{timestampValue:'2026-01-01T00:00:00Z'}}};
  global.fetch=async()=>({ok:true,status:200,json:async()=>record});
  try{
    const res=response();
    const path=articlePath('abc123',record.fields.title.stringValue);
    await articlePage({method:'GET',query:{id:'abc123',slug:path.split('/').at(-1)}},res);
    assert.equal(res.statusCode,200);
    assert.match(res.body,/meta name="robots" content="index,follow"/);
    assert.match(res.body,/&lt;script&gt;/);
    assert.match(res.body,/&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(res.body,/<img src=x onerror/);
    assert.match(res.body,/aria-label="Main navigation"/);
  }finally{global.fetch=fetchBefore;}
});
test('short legacy articles remain accessible but are not marked as indexable rich content',async()=>{
  const fetchBefore=global.fetch;
  global.fetch=async()=>({ok:true,status:200,json:async()=>({
    name:'projects/p/databases/(default)/documents/artifacts/edunexus-live/public/data/articles/short',
    fields:{title:{stringValue:'Short note'},content:{stringValue:'One sentence.'}}
  })});
  try{
    const res=response();
    await articlePage({method:'GET',query:{id:'short',slug:'short-note'}},res);
    assert.equal(res.statusCode,200);
    assert.match(res.body,/content="noindex,follow"/);
  }finally{global.fetch=fetchBefore;}
});
test('article sitemap excludes thin entries and includes existing substantial originals',async()=>{
  const fetchBefore=global.fetch;
  global.fetch=async()=>({ok:true,status:200,json:async()=>({documents:[
    {name:'projects/p/databases/(default)/documents/artifacts/edunexus-live/public/data/articles/good',
      fields:{title:{stringValue:'Original article'},content:{stringValue:'A detailed guide. '.repeat(40)}}},
    {name:'projects/p/databases/(default)/documents/artifacts/edunexus-live/public/data/articles/thin',
      fields:{title:{stringValue:'Thin article'},content:{stringValue:'Too short.'}}}
  ]})});
  try{
    const res=response();
    await articleSitemap({method:'GET'},res);
    assert.equal(res.statusCode,200);
    assert.match(res.body,/articles\/read\/good\/original-article/);
    assert.doesNotMatch(res.body,/articles\/read\/thin/);
  }finally{global.fetch=fetchBefore;}
});

test('custom domain is canonical while the old hostname remains an allowed fallback', () => {
  assert.equal(SITE, 'https://edunexus.dpdns.org');
  for (const path of ['public/index.html', 'public/sitemap.xml', 'public/robots.txt', 'src/SEO.js']) {
    const content = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.ok(content.includes('https://edunexus.dpdns.org'), path + ' must reference new domain');
    assert.ok(!content.includes('https://edunexus-app.vercel.app'), path + ' must not declare old canonical domain');
  }
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.git.deploymentEnabled.main, true);
  assert.equal(config.git.deploymentEnabled['**'], false);
  const edge = readFileSync(new URL('../supabase/functions/edunexus-sign-upload/index.ts', import.meta.url), 'utf8');
  assert.ok(edge.includes('"https://edunexus.dpdns.org"'));
  assert.ok(edge.includes('"https://edunexus-app.vercel.app"'));
});
