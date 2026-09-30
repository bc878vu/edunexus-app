import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar, renderFooter, renderThemeToggle, shellThemeBoot } from './site-shell.mjs';
import { getPublicArticle, articlePath, escapeHtml as h, slugFor, SITE, validId } from './resource-data.mjs';
import { sanitizeArticleHtml, articlePlainText } from '../src/article-sanitize.mjs';

// Bump when the article HTML rendering changes, so old cached pages refresh.
const RENDER_VERSION = 'v9-unified-shell-enhanced-images';


const articleContentSecurityPolicy = standaloneContentSecurityPolicy.includes('script-src')
  ? standaloneContentSecurityPolicy.replace("img-src 'self' data:", "img-src 'self' https: data:")
  : standaloneContentSecurityPolicy
      .replace("img-src 'self' data:", "img-src 'self' https: data:")
      .replace("style-src", "script-src 'unsafe-inline'; style-src");

const articlePageStyles = `
html{color-scheme:light}html.dark{color-scheme:dark}
.article-main{max-width:1120px;margin:32px auto;padding:0 20px}
.article-resource{padding:0!important;overflow:hidden}
.article-head{padding:clamp(22px,4vw,42px) clamp(20px,4vw,42px) 22px}
.article-kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;color:#4f46e5;font-size:.78rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
.article-kicker:before{content:"";width:8px;height:8px;border-radius:999px;background:#6366f1;box-shadow:0 0 0 5px #6366f120}
.article-meta{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:12px;color:#64748b;font-size:.88rem}
.article-cover-wrap{position:relative;margin:0;height:clamp(260px,46vw,520px);overflow:hidden;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#020617;isolation:isolate}
.article-cover{display:block;width:100%;height:100%;max-width:100%;object-fit:cover;object-position:center 30%;transition:transform .8s cubic-bezier(.16,1,.3,1),filter .5s ease}
.article-cover-wrap:hover .article-cover{transform:scale(1.025);filter:saturate(1.04) contrast(1.015)}
.article-cover-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(to top,rgba(2,6,23,.34),transparent 42%,rgba(2,6,23,.04))}
.article-cover-ring{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.article-cover-action{position:absolute;right:18px;bottom:16px;z-index:3;display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(2,6,23,.68);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff!important;text-decoration:none!important;font-size:.78rem;font-weight:800;box-shadow:0 10px 28px rgba(0,0,0,.28);transition:transform .2s ease,background .2s ease}
.article-cover-action:hover{transform:translateY(-2px);background:rgba(2,6,23,.88)}
.article-content{padding:clamp(22px,4vw,42px)}
.article-body{overflow-wrap:anywhere;line-height:1.85;font-size:1.02rem}
.article-body h2{font-size:1.45em;font-weight:800;margin:1.55em 0 .6em;line-height:1.3}.article-body h3{font-size:1.2em;font-weight:750;margin:1.35em 0 .5em}.article-body h4{font-size:1.07em;font-weight:750;margin:1.15em 0 .4em}.article-body p{margin:.9em 0}.article-body ul,.article-body ol{margin:.9em 0;padding-left:1.55em}.article-body ul{list-style:disc}.article-body ol{list-style:decimal}.article-body li{margin:.42em 0}.article-body a{color:#4f46e5;font-weight:650}.article-body blockquote{margin:1em 0;padding:.85em 1.2em;border-left:4px solid #6366f1;background:#eef2ff;border-radius:0 12px 12px 0;font-style:italic}.article-body hr{margin:1.6em 0;border:none;border-top:1px solid #cbd5e1}.article-site-footer{margin-top:38px;border-top:1px solid #dbe2ef;background:#f8fafc}.article-footer-inner{max-width:1120px;margin:auto;padding:34px 20px}.article-footer-cta{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid #c7d2fe;border-radius:18px;background:#eef2ff}.article-footer-cta strong{display:block;color:#172036}.article-footer-cta p{margin:3px 0 0;color:#64748b;font-size:.9rem}.article-footer-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:28px;margin-top:28px}.article-footer-grid h2{font-size:1rem;margin:0 0 10px}.article-footer-grid p,.article-footer-grid a{font-size:.9rem}.article-footer-grid p{color:#64748b}.article-footer-links{display:grid;gap:8px}.article-footer-links a{text-decoration:none;color:#334155;font-weight:650}.article-footer-links a:hover{color:#4f46e5}.article-footer-bottom{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:28px;padding-top:18px;border-top:1px solid #dbe2ef;color:#64748b;font-size:.82rem}
.dark .article-resource{background:#0f172a;border-color:#1e293b;box-shadow:0 18px 40px -28px #000}.dark .article-head,.dark .article-content{color:#e2e8f0}.dark .article-meta{color:#94a3b8}.dark .article-cover-wrap{border-color:#1e293b}.dark .article-body a{color:#a5b4fc}.dark .article-body blockquote{background:#1e293b;color:#e2e8f0}
@media(max-width:760px){.article-main{margin:18px auto;padding:0 12px}.article-head,.article-content{padding:20px}.article-cover-wrap{height:clamp(240px,68vw,390px)}.article-cover{object-position:center 28%}.article-cover-action{right:12px;bottom:12px;padding:8px 11px}}
`;

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
function optimizedArticleImage(url, width = 1800) {
  const value = String(url || '');
  if (!value.includes('/upload/')) return value;
  return value.replace('/upload/', '/upload/f_auto,q_auto:good,c_limit,w_' + width + ',dpr_auto/');
}

function articleImageSrcSet(url) {
  const value = String(url || '');
  if (!value.includes('/upload/')) return '';
  return [720, 1080, 1600, 2000].map((width) => optimizedArticleImage(value, width) + ' ' + width + 'w').join(', ');
}

function fallbackPage(title, social) {
  const safe = h(title || 'EduNexus Article');
  const sTitle = h(((social && social.title) || '').trim() || safe);
  const sDesc = h(((social && social.description) || '').trim() || 'Read this article on EduNexus.');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe} | EduNexus Articles</title><meta name="robots" content="noindex,follow"><meta property="og:title" content="${sTitle} | EduNexus"><meta property="og:description" content="${sDesc}"><meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${sTitle} | EduNexus"><meta name="twitter:description" content="${sDesc}">${shellThemeBoot}<style>${styles}${articlePageStyles}</style></head><body>${renderNavbar('articles')}${renderThemeToggle()}<main class="article-main"><article class="resource article-resource"><div class="article-head"><div class="article-kicker">EduNexus Official Article</div><h1>${safe}</h1><p>This article is temporarily unavailable. Please try again in a little while, or browse the latest articles below.</p><div class="buttons"><a class="button" href="/?page=articles">Browse articles</a><a class="button secondary" href="/">Back to home</a></div></div></article></main>${renderFooter()}</body></html>`;
}

export default async function handler(req,res){
  if (!['GET','HEAD'].includes(req.method))return res.status(405).end();
  const id=String(req.query?.id||'');
  if(!validId(id))return res.status(404).send('Article not found');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=900');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy', articleContentSecurityPolicy);
  if(req.method==='HEAD')return res.status(200).end();
  const qTitle=String(req.query?.t||'').replace(/\s+/g,' ').trim().slice(0,180);
  const qDesc=String(req.query?.d||'').replace(/\s+/g,' ').trim().slice(0,200);
  const cacheKey=id+'|t='+qTitle+'|d='+qDesc;
  const cachedFirst = cacheGet(cacheKey);
  if (cachedFirst) return res.status(200).send(cachedFirst);
  try{
    const article=await getPublicArticle(id);
    if(!article || !String(article.title||'').trim())return res.status(404).send('Article not found');
    const title=String(article.title).trim().slice(0,200);
    const rawText=String(article.body ?? article.content ?? '').trim().slice(0,120000);
    const bodyHtml=sanitizeArticleHtml(rawText);
    const plainText=articlePlainText(rawText);
    const path=articlePath(id,title);
    if(req.query?.slug!==slugFor(title))return res.redirect(301,path);
    const canonical=SITE+path;
    const sharedTitle=qTitle;
    const sharedDescription=qDesc;
    const socialTitle=sharedTitle || title;
    const excerpt=String(article.excerpt||'').replace(/\s+/g,' ').trim().slice(0,155);
    const description=sharedDescription || excerpt || plainText.replace(/\s+/g,' ').slice(0,155) || 'Article from the EduNexus student learning platform.';
    // Keep historical articles accessible without misrepresenting an empty or
    // one-sentence entry as a substantial indexable article.
    const indexable=plainText.length>=450;
    // Open Graph image for rich link previews (WhatsApp/Facebook/Twitter).
    const rawImage=String(article.coverUrl ?? article.cover_url ?? article.imageUrl ?? '').trim();
    // Social crawlers need a publicly fetchable HTTP(S) image. Prefer the
    // article cover everywhere; normalize our legacy Vercel asset URLs to the
    // canonical domain. Inline data URLs are not usable as og:image.
    const normalizedImage=/^https?:\/\//i.test(rawImage)
      ? rawImage.replace(/^https:\/\/edunexus-app\.vercel\.app/i, SITE)
      : rawImage && !/^data:/i.test(rawImage)
        ? SITE + (rawImage.startsWith('/') ? rawImage : '/' + rawImage)
        : '';
    const ogImage=normalizedImage || SITE + '/logo512.png';
    const author=String(article.author || 'EduNexus').replace(/\s+/g,' ').trim().slice(0,80) || 'EduNexus';
    const publishedLabel=article.createdAt && !Number.isNaN(Date.parse(article.createdAt))
      ? new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(new Date(article.createdAt))
      : '';
    const coverDisplayImage=normalizedImage ? optimizedArticleImage(normalizedImage, 1800) : '';
    const coverSrcSet=normalizedImage ? articleImageSrcSet(normalizedImage) : '';
    const coverHtml=normalizedImage
      ? '<figure class="article-cover-wrap"><img class="article-cover" src="' + h(coverDisplayImage) + '"' + (coverSrcSet ? ' srcset="' + h(coverSrcSet) + '" sizes="(max-width: 760px) 100vw, 1120px"' : '') + ' alt="' + h(title) + '" loading="eager" decoding="async" fetchpriority="high"><span class="article-cover-shade" aria-hidden="true"></span><span class="article-cover-ring" aria-hidden="true"></span><a class="article-cover-action" href="' + h(normalizedImage) + '" target="_blank" rel="noopener noreferrer" aria-label="Open full-size article image"><span aria-hidden="true">↗</span><span>View full image</span></a></figure>'
      : '';
    const date=article.createdAt && !Number.isNaN(Date.parse(article.createdAt)) ? article.createdAt:null;
    const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',
      headline:title,description,url:canonical,inLanguage:'en',
      author:{'@type':'Organization',name:'EduNexus'},
      publisher:{'@type':'Organization',name:'EduNexus',url:SITE},
      ...(normalizedImage?{image:normalizedImage}:{}),
      ...(date?{datePublished:date}:{}),
      isAccessibleForFree:true}).replace(/</g,'\\u003c');
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)} | EduNexus Articles</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(socialTitle + ' | EduNexus')}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:type" content="article"><meta property="og:image" content="${h(ogImage)}"><meta property="og:image:secure_url" content="${h(ogImage)}"><meta property="og:image:type" content="${/\.png(?:$|\?)/i.test(ogImage)?'image/png':/\.jpe?g(?:$|\?)/i.test(ogImage)?'image/jpeg':'image/webp'}"><meta property="og:image:alt" content="${h(title + ' — EduNexus')}"><meta property="og:site_name" content="EduNexus"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(socialTitle + ' | EduNexus')}"><meta name="twitter:description" content="${h(description)}"><meta name="twitter:image" content="${h(ogImage)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${shellThemeBoot}${standaloneAdScript}<script type="application/ld+json">${schema}</script><style>${styles}${articlePageStyles}</style></head><body>${renderNavbar('articles')}${renderThemeToggle()}<main class="article-main"><article class="resource article-resource"><div class="article-head"><div class="article-kicker">EduNexus Official Article</div><h1>${h(title)}</h1><div class="article-meta"><span>${h(author)}</span>${publishedLabel?'<span>Published '+h(publishedLabel)+'</span>':''}<span>Free student learning resource</span></div></div>${coverHtml}<div class="article-content">${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})<\/script></div>` : ''}<div class="article-body">${bodyHtml}</div>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})<\/script></div>` : ''}<div class="buttons"><a class="button secondary" href="/?page=articles">Browse more articles</a><a class="button" href="/study-guides">Read study guides</a></div></div></article></main>${renderFooter()}</body></html>`;
    cacheSet(cacheKey, html);
    return res.status(200).send(html);
  }catch(error){
    console.error('Public article lookup failed',error?.message||'unknown');
    const cached = cacheGet(id);
    if (cached) return res.status(200).send(cached);
    return res.status(200).send(fallbackPage('Article',{title:qTitle,description:qDesc}));
  }
}
