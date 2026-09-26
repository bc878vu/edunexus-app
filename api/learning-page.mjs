import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar } from './site-shell.mjs';
import { escapeHtml as h, SITE } from './resource-data.mjs';
import { SUBJECT_GUIDES, GUIDE_CODES } from './subject-guides.mjs';

export default function handler(req, res) {
  if (!['GET','HEAD'].includes(req.method)) return res.status(405).end();
  const code = String(req.query?.code || '').toUpperCase();
  const guide = SUBJECT_GUIDES[code];
  if (!guide) return res.status(404).send('Study guide not found');
  const slug = guide.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
  const path = '/learning/' + code.toLowerCase() + '/' + slug;
  if (req.query?.slug !== slug) return res.redirect(301,path);
  const canonical = SITE + path;
  const intro = guide.intro;
  const jsonLd = JSON.stringify({
    '@context':'https://schema.org','@type':'Article',headline:guide.title,
    description:intro,url:canonical, inLanguage:'en',
    author:{'@type':'Organization',name:'EduNexus'},
    publisher:{'@type':'Organization',name:'EduNexus',url:SITE},
    about:code + ' ' + guide.subject,
    isAccessibleForFree:true
  }).replace(/</g,'\\u003c');
  const related = GUIDE_CODES.filter((c)=>c!==code).slice(0,5).map((c)=>
    '<a href="/learning/'+c.toLowerCase()+'/'+SUBJECT_GUIDES[c].title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)+'">'+h(c)+' — '+h(SUBJECT_GUIDES[c].subject)+'</a>').join('');
  const paragraphs = guide.sections.map(({heading,text})=>
    '<section class="guide-section"><h2>'+h(heading)+'</h2><p>'+h(text)+'</p></section>').join('');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy', standaloneContentSecurityPolicy);
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(guide.title)} | EduNexus</title><meta name="description" content="${h(intro.slice(0,155))}"><meta name="robots" content="index,follow"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(guide.title)}"><meta property="og:description" content="${h(intro.slice(0,190))}"><meta property="og:url" content="${h(canonical)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${standaloneAdScript}<script type="application/ld+json">${jsonLd}</script><style>${styles}.guide-section{border-top:1px solid #dce1f0;padding-top:16px;margin-top:20px}.guide-section p{line-height:1.85}.related a{display:block;margin:8px 0}</style></head><body>${renderNavbar('academic')}<main><article class="resource"><div class="meta">Independent course study guide · ${h(code)} · ${h(guide.subject)}</div><h1>${h(guide.title)}</h1>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script></div>` : ''}<p>${h(intro)}</p>${paragraphs}<p><strong>Using this guide:</strong> These are independently written learning examples, not a claim that any uploaded PDF has been checked against a particular course edition. Verify current syllabus and assessment instructions with your institution.</p><div class="buttons"><a class="button" href="/?page=academic&subject=${encodeURIComponent(code)}">Browse ${h(code)} study files</a><a class="button secondary" href="/?page=exam-prep">Practise in Exam Prep</a></div></article><section class="reviews related"><h2>Continue learning</h2>${related}</section></main><footer class="site-footer"><p>© EduNexus · Independent student study resources</p><nav><a href="/?page=about">About</a><a href="/?page=privacy">Privacy Policy</a><a href="/?page=contact">Contact</a></nav></footer></body></html>`);
}
