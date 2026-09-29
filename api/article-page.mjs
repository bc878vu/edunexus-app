import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar } from './site-shell.mjs';
import { getPublicArticle, articlePath, escapeHtml as h, slugFor, SITE, validId } from './resource-data.mjs';
import { sanitizeArticleHtml, articlePlainText } from '../src/article-sanitize.mjs';

// Bump when the article HTML rendering changes, so old cached pages refresh.
const RENDER_VERSION = 'v4-rich-share-preview';

// In-memory cache: survives Firestore quota outages so shared article links keep working.
const pageCache = new Map(); // id -> { html, at }
const CACHE_TTL = 60 * 60 * 1000;
const MAX_CACHE = 200;
function cacheGet(id) {
  const e = pageCache.get(RENDER_VERSION + ':' + id);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) { pageCache.delete(id); return null; }
  return e.html;
}
function cacheSet(id, html) {
  if (pageCache.size >= MAX_CACHE) { const k = pageCache.keys().next().value; pageCache.delete(k); }
  pageCache.set(RENDER_VERSION + ':' + id, { html, at: Date.now() });
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
    const rawText=String(article.content||'').trim().slice(0,120000);
    const bodyHtml=sanitizeArticleHtml(rawText);
    const plainText=articlePlainText(rawText);
    const path=articlePath(id,title);
    if(req.query?.slug!==slugFor(title))return res.redirect(301,path);
    const canonical=SITE+path;
    const description=plainText.replace(/\s+/g,' ').slice(0,155)||'Article from the EduNexus student learning platform.';
    // Keep historical articles accessible without misrepresenting an empty or
    // one-sentence entry as a substantial indexable article.
    const indexable=plainText.length>=450;
    // Open Graph image for rich link previews (WhatsApp/Facebook/Twitter).
    const rawImage=String(article.imageUrl||'').trim();
    const ogImage=/^https?:\/\//i.test(rawImage) ? rawImage
      : rawImage ? SITE + (rawImage.startsWith('/') ? rawImage : '/' + rawImage)
      : SITE + '/logo512.png';
    const date=article.createdAt && !Number.isNaN(Date.parse(article.createdAt)) ? article.createdAt:null;
    const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',
      headline:title,description,url:canonical,inLanguage:'en',
      author:{'@type':'Organization',name:'EduNexus'},
      publisher:{'@type':'Organization',name:'EduNexus',url:SITE},
      ...(date?{datePublished:date}:{}),
      isAccessibleForFree:true}).replace(/</g,'\\u003c');
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)} | EduNexus Articles</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(title + ' | EduNexus')}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:type" content="article"><meta property="og:image" content="${h(ogImage)}"><meta property="og:image:secure_url" content="${h(ogImage)}"><meta property="og:image:alt" content="${h(title + ' — EduNexus')}"><meta property="og:site_name" content="EduNexus"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title + ' | EduNexus')}"><meta name="twitter:description" content="${h(description)}"><meta name="twitter:image" content="${h(ogImage)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${standaloneAdScript}<script type="application/ld+json">${schema}</script><style>${styles}.article-body{overflow-wrap:anywhere;line-height:1.85}.article-body h2{font-size:1.35em;font-weight:800;margin:1.5em 0 .6em;line-height:1.3}.article-body h3{font-size:1.15em;font-weight:700;margin:1.3em 0 .5em}.article-body h4{font-size:1.05em;font-weight:700;margin:1.1em 0 .4em}.article-body p{margin:.8em 0}.article-body ul,.article-body ol{margin:.8em 0;padding-left:1.5em}.article-body ul{list-style:disc}.article-body ol{list-style:decimal}.article-body li{margin:.4em 0}.article-body a{color:#4f46e5;font-weight:600}.article-body blockquote{margin:1em 0;padding:.8em 1.2em;border-left:4px solid #6366f1;font-style:italic}.article-body hr{margin:1.5em 0;border:none;border-top:1px solid #cbd5e1}</style></head><body>${renderNavbar('articles')}<main><article class="resource"><div class="meta">EduNexus · Articles</div><h1>${h(title)}</h1>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script></div>` : ''}<div class="article-body">${bodyHtml}</div>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})</script></div>` : ''}<div class="buttons"><a class="button secondary" href="/?page=articles">Browse more articles</a><a class="button" href="/study-guides">Read study guides</a></div></article></main><footer class="site-footer"><p>© EduNexus · Student study resources</p><nav><a href="/?page=about">About</a><a href="/?page=privacy">Privacy Policy</a><a href="/?page=contact">Contact</a></nav></footer></body></html>`;
    cacheSet(id, html);
    return res.status(200).send(html);
  }catch(error){
    console.error('Public article lookup failed',error?.message||'unknown');
    const cached = cacheGet(id);
    if (cached) return res.status(200).send(cached);
    return res.status(503).send(fallbackPage('Article'));
  }
}
