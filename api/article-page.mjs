import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar, renderFooter, renderThemeToggle, shellThemeBoot } from './site-shell.mjs';
import { getPublicArticle, listPublicArticles, articlePath, escapeHtml as h, slugFor, SITE, validId } from './resource-data.mjs';
import { sanitizeArticleHtml, articlePlainText } from '../src/article-sanitize.mjs';

// Bump when the article HTML rendering changes, so old cached pages refresh.
const RENDER_VERSION = 'v19-csp-connect-fix';
// Compact view counts: 999 -> "999", 1000 -> "1k", 1500 -> "1.5k", 26442 -> "26.4k".
const fmtViews = (n) => { n = Number(n) || 0; if (n < 1000) return String(n); if (n >= 1000000) { const m = Math.round(n / 100000) / 10; return (m % 1 === 0 ? String(Math.round(m)) : String(m)) + 'M'; } const k = Math.round(n / 100) / 10; return (k % 1 === 0 ? String(Math.round(k)) : String(k)) + 'k'; };


const articleContentSecurityPolicyBase = standaloneContentSecurityPolicy.includes('script-src')
  ? standaloneContentSecurityPolicy.replace("img-src 'self' data:", "img-src 'self' https: data:")
  : standaloneContentSecurityPolicy
      .replace("img-src 'self' data:", "img-src 'self' https: data:")
      .replace("style-src", "script-src 'unsafe-inline'; style-src");
// The inline comment/like/views script calls Supabase directly. Without an
// explicit connect-src the default-src 'none' above blocks EVERY such fetch
// in real browsers (curl ignores CSP, which is why server-side tests passed
// while every browser attempt failed). Keep this allowlist tight: only our
// Supabase host, nothing else.
const articleContentSecurityPolicy = articleContentSecurityPolicyBase + "; connect-src 'self' https://cprpndovdfnkvekewstv.supabase.co;";

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
.article-body h2{font-size:1.45em;font-weight:800;margin:1.55em 0 .6em;line-height:1.3}.article-body h3{font-size:1.2em;font-weight:750;margin:1.35em 0 .5em}.article-body h4{font-size:1.07em;font-weight:750;margin:1.15em 0 .4em}.article-body p{margin:.9em 0}.article-body ul,.article-body ol{margin:.9em 0;padding-left:1.55em}.article-body ul{list-style:disc}.article-body ol{list-style:decimal}.article-body li{margin:.42em 0}.article-body a{color:#4f46e5;font-weight:600;font:inherit;text-decoration:underline}.article-body a:hover{color:#4338ca}.article-body blockquote{margin:1em 0;padding:.85em 1.2em;border-left:4px solid #6366f1;background:#eef2ff;border-radius:0 12px 12px 0;font-style:italic}.article-body hr{margin:1.6em 0;border:none;border-top:1px solid #cbd5e1}.dark .article-resource{background:#0f172a;border-color:#1e293b;box-shadow:0 18px 40px -28px #000}.dark .article-head,.dark .article-content{color:#e2e8f0}.dark .article-meta{color:#94a3b8}.dark .article-cover-wrap{border-color:#1e293b}.article-body table{border-collapse:collapse;margin:1em 0;width:100%}.article-body th,.article-body td{border:1px solid #cbd5e1;padding:.5em .7em;text-align:left}.article-body th{background:#eef2ff}.article-body img{max-width:100%;height:auto;border-radius:12px}.article-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:1.5rem 0 0;padding:.6rem .8rem;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.article-actions button{display:inline-flex;align-items:center;gap:.45rem;border:none;background:transparent;border-radius:.6rem;padding:.55rem .9rem;font-weight:700;font-size:.9rem;color:#475569;cursor:pointer}.article-actions button:hover{background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.12);color:#ef4444}#edx-share:hover{color:#16a34a}.article-actions button[disabled]{color:#ef4444;background:#fef2f2;cursor:default}.dark .article-actions{background:#1e293b;border-color:#334155}.dark .article-actions button{color:#cbd5e1}.edx-comments{margin:1rem 0 1.5rem}.edx-comment-box{border:1px solid #cbd5e1;border-radius:16px;padding:.75rem .9rem;background:#fff;display:grid;gap:.5rem}.edx-comment-box input,.edx-comment-box textarea{width:100%;border:1px solid #e2e8f0;border-radius:10px;outline:none;box-sizing:border-box;background:#f8fafc;color:#0f172a;padding:.55rem .7rem;font-family:inherit}.edx-comment-box input{font-weight:700;font-size:.85rem}.edx-comment-box textarea{resize:vertical;font-size:.95rem;min-height:64px}.edx-comment-box input::placeholder,.edx-comment-box textarea::placeholder{color:#94a3b8}.dark .edx-comment-box{background:#1e293b;border-color:#334155}.dark .edx-comment-box input,.dark .edx-comment-box textarea{background:#0f172a;border-color:#334155;color:#e2e8f0}.dark .edx-comment-box input::placeholder,.dark .edx-comment-box textarea::placeholder{color:#64748b}.dark .edx-bubble{background:#1e293b;color:#e2e8f0}.edx-comment-row{display:flex;gap:.6rem;margin:.8rem 0}.edx-avatar{flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:#e0e7ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-weight:800}.edx-bubble{background:#f1f5f9;border-radius:16px;padding:.55rem .85rem}.edx-bubble b{font-size:.85rem}.edx-bubble small{opacity:.6;font-size:.75rem}.dark .article-body a{color:#a5b4fc}.dark .article-body blockquote{background:#1e293b;color:#e2e8f0}
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
      ? '<figure class="article-cover-wrap"><img class="article-cover" src="' + h(coverDisplayImage) + '"' + (coverSrcSet ? ' srcset="' + h(coverSrcSet) + '" sizes="(max-width: 760px) 100vw, 1120px"' : '') + ' alt="' + h(title) + '" loading="eager" decoding="async" fetchpriority="high"><span class="article-cover-shade" aria-hidden="true"></span><span class="article-cover-ring" aria-hidden="true"></span><a class="article-cover-action" href="' + h(normalizedImage) + '" data-shell-image-lightbox data-image-alt="' + h(title) + '" aria-label="Open full-size article image"><span aria-hidden="true">↗</span><span>View full image</span></a></figure>'
      : '';
    const date=article.createdAt && !Number.isNaN(Date.parse(article.createdAt)) ? article.createdAt:null;
    const views = Number(article.views ?? (article.extra && article.extra.views) ?? 0) || 0;
    // Related articles: same-topic internal links on every article page, so
    // Google discovers and ranks each article for its related searches too.
    // Best-effort only: a failure here must never break the article itself.
    let relatedHtml = '';
    try {
      const STOP = new Set(['a','an','the','and','or','of','to','for','in','on','at','with','how','what','when','why','is','are','vu','2026']);
      const words = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
      const mine = new Set(words(title));
      const others = (await listPublicArticles(3)).filter((item) => {
        if (!item || item.id === id || !String(item.title || '').trim()) return false;
        if (item.isActive === false) return false;
        return String(item.body ?? item.content ?? '').trim().length >= 450;
      });
      const scored = others.map((item) => {
        const shared = words(item.title).filter((w) => mine.has(w)).length;
        return { item, shared };
      }).sort((a, b) => (b.shared - a.shared) || String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || '')));
      const picked = scored.slice(0, 4);
      if (picked.length) {
        relatedHtml = '<section class="edx-related" style="margin:2.5rem 0 0;border-top:1px solid #e5e7eb;padding-top:1.5rem"><h2 style="font-size:1.25rem;margin:0 0 1rem">Related articles</h2><ul style="list-style:none;margin:0;padding:0;display:grid;gap:.75rem">' +
          picked.map(({ item }) => '<li><a href="' + h(SITE + articlePath(item.id, item.title)) + '" style="color:#4f46e5;font-weight:600">' + h(String(item.title).trim().slice(0, 150)) + '</a></li>').join('') +
          '</ul></section>';
      }
    } catch (e) { relatedHtml = ''; }
    const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',
      headline:title,description,url:canonical,inLanguage:'en',
      author:{'@type':'Organization',name:'EduNexus'},
      publisher:{'@type':'Organization',name:'EduNexus',url:SITE},
      ...(normalizedImage?{image:normalizedImage}:{}),
      ...(date?{datePublished:date}:{}),
      isAccessibleForFree:true}).replace(/</g,'\\u003c');
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)} | EduNexus Articles</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(socialTitle + ' | EduNexus')}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:type" content="article"><meta property="og:image" content="${h(ogImage)}"><meta property="og:image:secure_url" content="${h(ogImage)}"><meta property="og:image:type" content="${/\.png(?:$|\?)/i.test(ogImage)?'image/png':/\.jpe?g(?:$|\?)/i.test(ogImage)?'image/jpeg':'image/webp'}"><meta property="og:image:alt" content="${h(title + ' — EduNexus')}"><meta property="og:site_name" content="EduNexus"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(socialTitle + ' | EduNexus')}"><meta name="twitter:description" content="${h(description)}"><meta name="twitter:image" content="${h(ogImage)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${shellThemeBoot}${standaloneAdScript}<script type="application/ld+json">${schema}</script><style>${styles}${articlePageStyles}</style></head><body>${renderNavbar('articles')}${renderThemeToggle()}<main class="article-main"><article class="resource article-resource"><div class="article-head"><div class="article-kicker">EduNexus Official Article</div><h1>${h(title)}</h1><div class="article-meta"><span>${h(author)}</span><span id="edx-views">👁 ${fmtViews(views)} views</span>${publishedLabel?'<span>Published '+h(publishedLabel)+'</span>':''}<span>Free student learning resource</span></div></div>${coverHtml}<div class="article-content">${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})<\/script></div>` : ''}<div class="article-body">${bodyHtml}</div>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})<\/script></div>` : ''}<div class="article-actions"><button id="edx-like" type="button">♥ <span id="edx-like-count">${Number(article.likes) || 0}</span> Like</button><button id="edx-share" type="button">↗ Share</button></div><section class="edx-comments"><h2>Comments &amp; Suggestions</h2><div class="edx-comment-box"><input id="edx-c-name" maxlength="80" placeholder="Your name"><textarea id="edx-c-text" maxlength="1000" rows="2" placeholder="Write a comment..."></textarea></div><div style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem"><button id="edx-c-send" type="button" class="button">Post comment</button><p id="edx-c-msg" style="opacity:.7;margin:0"></p></div><div id="edx-comment-list"></div></section>${relatedHtml}<div class="buttons"><a class="button secondary" href="/?page=articles">Browse more articles</a><a class="button" href="/study-guides">Read study guides</a></div></div></article></main><script>(function(){var id=${JSON.stringify(id)};var baseLikes=${Number(article.likes) || 0};var canon=${JSON.stringify(canonical)};var SB='https://cprpndovdfnkvekewstv.supabase.co/rest/v1';var KEY='sb_publishable_mEibYO_BunfJGJm66fZHhw_hHxWL8TC';var H={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}var dev=localStorage.getItem('edx-device-id');if(!dev){dev='guest-'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('edx-device-id',dev);}var likeBtn=document.getElementById('edx-like'),likeCount=document.getElementById('edx-like-count');var liked=localStorage.getItem('edx-liked-'+id)==='1';function paintLike(){likeCount.textContent=baseLikes+(liked?1:0);likeBtn.disabled=liked;likeBtn.textContent='♥ '+likeCount.textContent+' '+(liked?'Liked':'Like');}paintLike();var viewsEl=document.getElementById('edx-views');function fmtV(n){n=Number(n)||0;if(n<1000)return String(n);if(n>=1000000){var m=Math.round(n/100000)/10;return (m%1===0?Math.round(m):m)+'M';}var k=Math.round(n/100)/10;return (k%1===0?Math.round(k):k)+'k';}function paintViews(n){if(viewsEl)viewsEl.textContent='\uD83D\uDC41 '+fmtV(n)+' views';}try{fetch(SB+'/articles?id=eq.'+encodeURIComponent(id)+'&select=extra',{headers:H}).then(function(r){return r.json();}).then(function(rows){var cur=Number((rows[0]&&rows[0].extra&&rows[0].extra.views)||0)||0;paintViews(cur);if(!sessionStorage.getItem('edx-viewed-'+id)){sessionStorage.setItem('edx-viewed-'+id,'1');var curExtra=(rows[0]&&rows[0].extra)||{};var nx=Object.assign({},curExtra,{views:cur+1});fetch(SB+'/articles?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:H,body:JSON.stringify({extra:nx})}).then(function(){paintViews(cur+1);}).catch(function(){});}}).catch(function(){});}catch(e){}likeBtn.onclick=function(){if(liked)return;liked=true;localStorage.setItem('edx-liked-'+id,'1');paintLike();fetch(SB+'/article_likes',{method:'POST',headers:H,body:JSON.stringify({article_id:id,user_id:dev})}).catch(function(){});};document.getElementById('edx-share').onclick=function(){if(navigator.share){navigator.share({title:document.title,url:canon}).catch(function(){});}else{navigator.clipboard.writeText(canon).then(function(){alert('Link copied!');}).catch(function(){});}};var list=document.getElementById('edx-comment-list');var replyTo=null;var commentNames={};var replyNote=document.createElement('div');replyNote.style.cssText='display:none;margin-top:.5rem;font-size:.85rem;opacity:.85';var cbox=document.querySelector('.edx-comment-box');if(cbox&&cbox.parentNode)cbox.parentNode.insertBefore(replyNote,cbox.nextSibling);function showReplyNote(){if(replyTo){replyNote.style.display='block';replyNote.innerHTML='Replying to <b>'+esc(commentNames[replyTo]||'this comment')+'</b> <button type="button" id="edx-c-cancel-reply" style="margin-left:.5rem;cursor:pointer">Cancel</button>';document.getElementById('edx-c-cancel-reply').onclick=function(){replyTo=null;replyNote.style.display='none';};}else{replyNote.style.display='none';}}function commentHtml(c){var nm=c.user_name||'Student';return '<div class="edx-comment-row"><div class="edx-avatar">'+esc(nm.charAt(0).toUpperCase())+'</div><div class="edx-bubble"><b>'+esc(nm)+'</b><div>'+esc(c.text)+'</div><small>'+(c.created_at?new Date(c.created_at).toLocaleString():'')+'</small><div><button type="button" class="edx-c-reply" data-id="'+esc(c.id)+'" style="background:none;border:none;color:#4f46e5;font-weight:700;font-size:.8rem;cursor:pointer;padding:.25rem 0">Reply</button></div></div></div>';}function renderComments(items){items=items||[];var ids={};items.forEach(function(c){ids[c.id]=1;commentNames[c.id]=c.user_name||'Student';});var tops=items.filter(function(c){return !c.parent_comment_id||!ids[c.parent_comment_id];});var reps=function(pid){return items.filter(function(c){return c.parent_comment_id===pid;});};list.innerHTML=tops.map(function(c){var r=reps(c.id).map(function(x){return '<div style="margin-left:2.75rem">'+commentHtml(x)+'</div>';}).join('');return commentHtml(c)+r;}).join('')||'<p style="opacity:.7">No comments yet. Be the first to comment.</p>';var btns=list.querySelectorAll('.edx-c-reply');btns.forEach(function(b){b.onclick=function(){replyTo=b.getAttribute('data-id');showReplyNote();document.getElementById('edx-c-text').focus();};});}function loadComments(){fetch(SB+'/article_comments?article_id=eq.'+encodeURIComponent(id)+'&moderation_status=eq.published&order=created_at.asc&select=id,parent_comment_id,user_name,text,created_at',{headers:H}).then(function(r){if(!r.ok)throw new Error('retry');return r.json();}).then(renderComments).catch(function(){fetch(SB+'/article_comments?article_id=eq.'+encodeURIComponent(id)+'&order=created_at.asc&select=id,user_name,text,created_at,moderation_status',{headers:H}).then(function(r){return r.json();}).then(function(items){renderComments((Array.isArray(items)?items:[]).filter(function(c){return !c.moderation_status||c.moderation_status==='published';}));}).catch(function(){list.innerHTML='<p style="opacity:.7">Comments could not be loaded. Please reload the page.</p>';});});}loadComments();var BAD=['islam murdabad','muslim murdabad','pakistan murdabad','army murdabad','fauj murdabad','pak army murdabad','porn','sex video','xxx video','vote for pti','vote for pmln','vote for ppp','lanat ho','beghairat'];document.getElementById('edx-c-send').onclick=function(){var nm=document.getElementById('edx-c-name').value.trim();var tx=document.getElementById('edx-c-text').value.trim();var msg=document.getElementById('edx-c-msg');if(!nm||!tx){msg.textContent='Please write your name and comment.';return;}var low=tx.toLowerCase();var flagged=BAD.some(function(p){return low.indexOf(p)>=0;});var status=flagged?'pending':'published';var body={id:(window.crypto&&crypto.randomUUID?crypto.randomUUID():'c-'+Date.now().toString(36)+Math.random().toString(36).slice(2)),article_id:id,user_id:dev,user_name:nm,text:tx.slice(0,1000),moderation_status:status};if(replyTo)body.parent_comment_id=replyTo;fetch(SB+'/article_comments',{method:'POST',headers:Object.assign({},H,{'Prefer':'return=representation'}),body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error('post failed');msg.textContent=flagged?'Your comment was sent for admin approval.':'Comment posted!';document.getElementById('edx-c-text').value='';replyTo=null;showReplyNote();if(!flagged)loadComments();}).catch(function(){msg.textContent='Could not post this comment from this open page. Please reload the page (Ctrl+F5) and try again — your text is still in the box.';});};})();</script>${renderFooter()}</body></html>`;
    cacheSet(cacheKey, html);
    return res.status(200).send(html);
  }catch(error){
    console.error('Public article lookup failed',error?.message||'unknown');
    const cached = cacheGet(id);
    if (cached) return res.status(200).send(cached);
    return res.status(200).send(fallbackPage('Article',{title:qTitle,description:qDesc}));
  }
}
