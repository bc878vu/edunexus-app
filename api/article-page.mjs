import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar } from './site-shell.mjs';
import { getPublicArticle, articlePath, escapeHtml as h, slugFor, SITE, validId } from './resource-data.mjs';

// In-memory cache: survives Firestore quota outages so shared article links keep working.
const pageCache = new Map(); // id -> { html, at }
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_CACHE = 200;
function cacheGet(id) {
  const e = pageCache.get(id);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) { pageCache.delete(id); return null; }
  return e.html;
}
function cacheSet(id, html) {
  if (pageCache.size >= MAX_CACHE) { const k = pageCache.keys().next().value; pageCache.delete(k); }
  pageCache.set(id, { html, at: Date.now() });
}
function fallbackPage(title) {
  const safe = h(title || 'EduNexus Article');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe} | EduNexus Articles</title><meta name="robots" content="noindex,follow"><style>${styles}</style></head><body>${renderNavbar('articles')}<main><article class="resource"><div class="meta">EduNexus · Articles</div><h1>${safe}</h1><p>This article is temporarily unavailable. Please try again in a little while, or browse the latest articles below.</p><div class="buttons"><a class="button" href="/?page=articles">Browse articles</a><a class="button secondary" href="/">Back to home</a></div></article></main><footer class="site-footer"><p>© EduNexus · Student study resources</p></footer></body></html>`;
}

export default async function handler(req,res){
  if (!['GET','HEAD'].includes(req.method))return res.status(405).end();
  const id=String(req.query?.id||'');
  if(!validId(id))return res.status(404).send('Article not found');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=900');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy', standaloneContentSecurityPolicy);
  if(req.method==='HEAD')return res.status(200).end();
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
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)} | EduNexus Articles</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${standaloneAdScript}<script type="application/ld+json">${schema}</script><style>${styles}.article-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.85}</style></head><body>${renderNavbar('articles')}<main><article class="resource"><div class="meta">EduNexus · Articles</div><h1>${h(title)}</h1>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script></div>` : ''}<div class="article-body">${h(text)}</div>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script></div>` : ''}<div class="buttons"><a class="button secondary" href="/?page=articles">Browse more articles</a><a class="button" href="/study-guides">Read study guides</a></div></article></main><footer class="site-footer"><p>© EduNexus · Student study resources</p><nav><a href="/?page=about">About</a><a href="/?page=privacy">Privacy Policy</a><a href="/?page=contact">Contact</a></nav></footer></body></html>`;
    cacheSet(id, html);
    return res.status(200).send(html);
  }catch(error){
    console.error('Public article lookup failed',error?.message||'unknown');
    const cached = cacheGet(id);
    if (cached) return res.status(200).send(cached);
    return res.status(503).send(fallbackPage('Article'));
  }
}
