import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar } from './site-shell.mjs';
import { getPublicArticle, articlePath, escapeHtml as h, slugFor, SITE, validId } from './resource-data.mjs';

export default async function handler(req,res){
  if (!['GET','HEAD'].includes(req.method))return res.status(405).end();
  const id=String(req.query?.id||'');
  if(!validId(id))return res.status(404).send('Article not found');
  try{
    const article=await getPublicArticle(id);
    if(!article || !String(article.title||'').trim())return res.status(404).send('Article not found');
    const title=String(article.title).trim().slice(0,200);
    const text=String(article.content||'').trim().slice(0,120000);
    const path=articlePath(id,title);
    if(req.query?.slug!==slugFor(title))return res.redirect(301,path);
    const canonical=SITE+path;
    const description=text.replace(/\s+/g,' ').slice(0,155)||'Article from the EduNexus student learning platform.';
    // Keep historical articles accessible without misrepresenting an empty or
    // one-sentence entry as a substantial indexable article.
    const indexable=text.length>=450;
    const date=article.createdAt && !Number.isNaN(Date.parse(article.createdAt)) ? article.createdAt:null;
    const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',
      headline:title,description,url:canonical,inLanguage:'en',
      author:{'@type':'Organization',name:'EduNexus'},
      publisher:{'@type':'Organization',name:'EduNexus',url:SITE},
      ...(date?{datePublished:date}:{}),
      isAccessibleForFree:true}).replace(/</g,'\\u003c');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=900');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy', standaloneContentSecurityPolicy);
    if(req.method==='HEAD')return res.status(200).end();
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)} | EduNexus Articles</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${standaloneAdScript}<script type="application/ld+json">${schema}</script><style>${styles}.article-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.85}</style></head><body>${renderNavbar('articles')}<main><article class="resource"><div class="meta">EduNexus · Articles</div><h1>${h(title)}</h1><div class="article-body">${h(text)}</div><div class="buttons"><a class="button secondary" href="/?page=articles">Browse more articles</a><a class="button" href="/study-guides">Read study guides</a></div></article></main><footer class="site-footer"><p>© EduNexus · Student study resources</p><nav><a href="/?page=about">About</a><a href="/?page=privacy">Privacy Policy</a><a href="/?page=contact">Contact</a></nav></footer></body></html>`);
  }catch(error){console.error('Public article lookup failed',error?.message||'unknown');return res.status(503).send('Article temporarily unavailable');}
}
