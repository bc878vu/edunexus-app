import { standaloneAdScript, standaloneContentSecurityPolicy } from './ad-support.mjs';
import { styles } from './resource-page.mjs';
import { renderNavbar } from './site-shell.mjs';
import { getPublicArticle, articlePath, escapeHtml as h, slugFor, SITE, validId } from './resource-data.mjs';
import { sanitizeArticleHtml, articlePlainText } from '../src/article-sanitize.mjs';

// Bump when the article HTML rendering changes, so old cached pages refresh.
const RENDER_VERSION = 'v7-integrated-article-shell';


const articleContentSecurityPolicy = standaloneContentSecurityPolicy.includes('script-src')
  ? standaloneContentSecurityPolicy.replace("img-src 'self' data:", "img-src 'self' https: data:")
  : standaloneContentSecurityPolicy
      .replace("img-src 'self' data:", "img-src 'self' https: data:")
      .replace("style-src", "script-src 'unsafe-inline'; style-src");

const articleThemeBoot = '<script>(function(){try{var t=localStorage.getItem("theme");var d=t==="dark";document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();<\/script>';

const articlePageStyles = `
html{color-scheme:light}html.dark{color-scheme:dark}
.article-main{max-width:1120px;margin:32px auto;padding:0 20px}
.article-resource{padding:0!important;overflow:hidden}
.article-head{padding:clamp(22px,4vw,42px) clamp(20px,4vw,42px) 22px}
.article-kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;color:#4f46e5;font-size:.78rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
.article-kicker:before{content:"";width:8px;height:8px;border-radius:999px;background:#6366f1;box-shadow:0 0 0 5px #6366f120}
.article-meta{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:12px;color:#64748b;font-size:.88rem}
.article-cover-wrap{margin:0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#0f172a}
.article-cover{display:block;width:100%;height:auto;max-width:100%;object-fit:contain}
.article-content{padding:clamp(22px,4vw,42px)}
.article-body{overflow-wrap:anywhere;line-height:1.85;font-size:1.02rem}
.article-body h2{font-size:1.45em;font-weight:800;margin:1.55em 0 .6em;line-height:1.3}.article-body h3{font-size:1.2em;font-weight:750;margin:1.35em 0 .5em}.article-body h4{font-size:1.07em;font-weight:750;margin:1.15em 0 .4em}.article-body p{margin:.9em 0}.article-body ul,.article-body ol{margin:.9em 0;padding-left:1.55em}.article-body ul{list-style:disc}.article-body ol{list-style:decimal}.article-body li{margin:.42em 0}.article-body a{color:#4f46e5;font-weight:650}.article-body blockquote{margin:1em 0;padding:.85em 1.2em;border-left:4px solid #6366f1;background:#eef2ff;border-radius:0 12px 12px 0;font-style:italic}.article-body hr{margin:1.6em 0;border:none;border-top:1px solid #cbd5e1}
.article-theme-toggle{position:fixed;top:88px;right:16px;z-index:60;width:42px;height:42px;border-radius:999px;border:1px solid #334155;background:#0f172a;color:#fcd34d;display:grid;place-items:center;box-shadow:0 8px 24px #0003;cursor:pointer;font-size:1.05rem}.article-theme-toggle:hover{background:#1e293b}.article-theme-toggle .sun{display:none}.dark .article-theme-toggle .sun{display:inline}.dark .article-theme-toggle .moon{display:none}
.article-site-footer{margin-top:38px;border-top:1px solid #dbe2ef;background:#f8fafc}.article-footer-inner{max-width:1120px;margin:auto;padding:34px 20px}.article-footer-cta{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid #c7d2fe;border-radius:18px;background:#eef2ff}.article-footer-cta strong{display:block;color:#172036}.article-footer-cta p{margin:3px 0 0;color:#64748b;font-size:.9rem}.article-footer-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:28px;margin-top:28px}.article-footer-grid h2{font-size:1rem;margin:0 0 10px}.article-footer-grid p,.article-footer-grid a{font-size:.9rem}.article-footer-grid p{color:#64748b}.article-footer-links{display:grid;gap:8px}.article-footer-links a{text-decoration:none;color:#334155;font-weight:650}.article-footer-links a:hover{color:#4f46e5}.article-footer-bottom{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:28px;padding-top:18px;border-top:1px solid #dbe2ef;color:#64748b;font-size:.82rem}
.dark body{background:#020617;color:#e2e8f0}.dark .article-resource{background:#0f172a;border-color:#1e293b;box-shadow:0 18px 40px -28px #000}.dark .article-head,.dark .article-content{color:#e2e8f0}.dark .article-meta{color:#94a3b8}.dark .article-cover-wrap{border-color:#1e293b}.dark .article-body a{color:#a5b4fc}.dark .article-body blockquote{background:#1e293b;color:#e2e8f0}.dark .article-site-footer{background:#020617;border-color:#1e293b}.dark .article-footer-cta{background:#312e811f;border-color:#6366f166}.dark .article-footer-cta strong,.dark .article-footer-grid h2{color:#f1f5f9}.dark .article-footer-cta p,.dark .article-footer-grid p,.dark .article-footer-bottom{color:#94a3b8}.dark .article-footer-links a{color:#cbd5e1}.dark .article-footer-bottom{border-color:#1e293b}.dark .article-theme-toggle{background:#f59e0b14;border-color:#fbbf2466;color:#fde68a}
@media(max-width:760px){.article-main{margin:18px auto;padding:0 12px}.article-head,.article-content{padding:20px}.article-footer-grid{grid-template-columns:1fr}.article-footer-cta{align-items:flex-start;flex-direction:column}.article-theme-toggle{top:76px;right:12px;width:40px;height:40px}}
`;

function renderThemeToggle() {
  return '<button type="button" class="article-theme-toggle" aria-label="Toggle dark / light mode" title="Dark / light mode" onclick="(function(b){try{var d=!document.documentElement.classList.contains(\'dark\');document.documentElement.classList.toggle(\'dark\',d);document.documentElement.style.colorScheme=d?\'dark\':\'light\';localStorage.setItem(\'theme\',d?\'dark\':\'light\');document.cookie=\'edunexus_theme=\'+(d?\'dark\':\'light\')+\'; Max-Age=31536000; Path=/; SameSite=Lax\';b.setAttribute(\'aria-pressed\',d?\'true\':\'false\');}catch(e){}})(this)"><span class="sun" aria-hidden="true">☀</span><span class="moon" aria-hidden="true">☾</span></button>';
}

function renderArticleFooter() {
  return `<footer class="article-site-footer"><div class="article-footer-inner">
    <div class="article-footer-cta"><div><strong>Study updates or found an issue?</strong><p>Use EduNexus support for corrections, study-resource suggestions and technical feedback.</p></div><a class="button" href="/?page=contact">Contact Support</a></div>
    <div class="article-footer-grid">
      <section><h2>EduNexus</h2><p>Independent study hub for Virtual University students with notes, exam-prep material, articles and practical study tools.</p></section>
      <section><h2>Quick Links</h2><nav class="article-footer-links" aria-label="Article footer quick links"><a href="/">Home</a><a href="/?page=academic">Academic Hub</a><a href="/?page=articles">Articles</a><a href="/?page=cgpa">CGPA Calculator</a></nav></section>
      <section><h2>Study Tools</h2><nav class="article-footer-links" aria-label="Article footer study tools"><a href="/?page=exam-prep">MCQ Bank & Paper Reviews</a><a href="/?page=flashcards">AI Flashcards</a><a href="/?page=planner">Study Planner</a><a href="/?page=aiquiz">AI Quiz Generator</a></nav></section>
    </div>
    <div class="article-footer-bottom"><span>© ${new Date().getFullYear()} EduNexus · Developed by Asad Amanat Ali.</span><span><a href="/?page=privacy">Privacy Policy</a> · <a href="/?page=terms">Terms of Service</a> · Light & Dark mode supported</span></div>
  </div></footer>`;
}

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
function fallbackPage(title, social) {
  const safe = h(title || 'EduNexus Article');
  const sTitle = h(((social && social.title) || '').trim() || safe);
  const sDesc = h(((social && social.description) || '').trim() || 'Read this article on EduNexus.');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe} | EduNexus Articles</title><meta name="robots" content="noindex,follow"><meta property="og:title" content="${sTitle} | EduNexus"><meta property="og:description" content="${sDesc}"><meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${sTitle} | EduNexus"><meta name="twitter:description" content="${sDesc}">${articleThemeBoot}<style>${styles}${articlePageStyles}</style></head><body>${renderNavbar('articles')}${renderThemeToggle()}<main class="article-main"><article class="resource article-resource"><div class="article-head"><div class="article-kicker">EduNexus Official Article</div><h1>${safe}</h1><p>This article is temporarily unavailable. Please try again in a little while, or browse the latest articles below.</p><div class="buttons"><a class="button" href="/?page=articles">Browse articles</a><a class="button secondary" href="/">Back to home</a></div></div></article></main>${renderArticleFooter()}</body></html>`;
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
    const coverHtml=normalizedImage
      ? '<div class="article-cover-wrap"><img class="article-cover" src="' + h(normalizedImage) + '" alt="' + h(title) + '" loading="eager" decoding="async"></div>'
      : '';
    const date=article.createdAt && !Number.isNaN(Date.parse(article.createdAt)) ? article.createdAt:null;
    const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',
      headline:title,description,url:canonical,inLanguage:'en',
      author:{'@type':'Organization',name:'EduNexus'},
      publisher:{'@type':'Organization',name:'EduNexus',url:SITE},
      ...(normalizedImage?{image:normalizedImage}:{}),
      ...(date?{datePublished:date}:{}),
      isAccessibleForFree:true}).replace(/</g,'\\u003c');
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)} | EduNexus Articles</title><meta name="description" content="${h(description)}"><meta name="robots" content="${indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${h(canonical)}"><meta property="og:title" content="${h(socialTitle + ' | EduNexus')}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:type" content="article"><meta property="og:image" content="${h(ogImage)}"><meta property="og:image:secure_url" content="${h(ogImage)}"><meta property="og:image:type" content="${/\.png(?:$|\?)/i.test(ogImage)?'image/png':/\.jpe?g(?:$|\?)/i.test(ogImage)?'image/jpeg':'image/webp'}"><meta property="og:image:alt" content="${h(title + ' — EduNexus')}"><meta property="og:site_name" content="EduNexus"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(socialTitle + ' | EduNexus')}"><meta name="twitter:description" content="${h(description)}"><meta name="twitter:image" content="${h(ogImage)}"><meta name="google-adsense-account" content="ca-pub-5179042048080611">${articleThemeBoot}${standaloneAdScript}<script type="application/ld+json">${schema}</script><style>${styles}${articlePageStyles}</style></head><body>${renderNavbar('articles')}${renderThemeToggle()}<main class="article-main"><article class="resource article-resource"><div class="article-head"><div class="article-kicker">EduNexus Official Article</div><h1>${h(title)}</h1><div class="article-meta"><span>${h(author)}</span>${publishedLabel?'<span>Published '+h(publishedLabel)+'</span>':''}<span>Free student learning resource</span></div></div>${coverHtml}<div class="article-content">${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})<\/script></div>` : ''}<div class="article-body">${bodyHtml}</div>${standaloneAdScript ? `<div style="margin:1.5rem auto;text-align:center;max-width:100%;overflow:hidden"><div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5179042048080611" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({})<\/script></div>` : ''}<div class="buttons"><a class="button secondary" href="/?page=articles">Browse more articles</a><a class="button" href="/study-guides">Read study guides</a></div></div></article></main>${renderArticleFooter()}</body></html>`;
    cacheSet(cacheKey, html);
    return res.status(200).send(html);
  }catch(error){
    console.error('Public article lookup failed',error?.message||'unknown');
    const cached = cacheGet(id);
    if (cached) return res.status(200).send(cached);
    return res.status(200).send(fallbackPage('Article',{title:qTitle,description:qDesc}));
  }
}
