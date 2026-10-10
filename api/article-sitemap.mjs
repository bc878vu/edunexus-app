import { listPublicArticles, listPublicHighlights, articlePath, highlightPath, SITE, escapeHtml as h } from './resource-data.mjs';

export const maxDuration=60;
// In-memory caches: survive backend outages so Googlebot never gets a 503.
let cachedXml=null;let cachedAt=0;
let cachedHlXml=null;let cachedHlAt=0;
const CACHE_TTL=6*60*60*1000;
function buildXml(urls){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map((url)=>'<url><loc>'+h(url)+'</loc></url>').join('\n')+'\n</urlset>';}
function buildHighlightsXml(urls){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map((url)=>'<url><loc>'+h(url)+'</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>').join('\n')+'\n</urlset>';}
export default async function handler(req,res){
  if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
  res.setHeader('Content-Type','application/xml; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='HEAD')return res.status(200).end();
  // Folded-in highlights sitemap (was api/highlights-sitemap.mjs): keeps the
  // api/ file count within the Vercel Hobby 12-function limit.
  // Route: /highlights-sitemap.xml -> /api/article-sitemap?kind=highlights
  const kind=req.query&&req.query.kind;
  if(kind==='highlights'){
    try{
      const items=await listPublicHighlights(100);
      const seen=new Set();
      const urls=items.filter((item)=>{
        if(!item.id||!String(item.title||'').trim()||seen.has(item.id))return false;
        seen.add(item.id);return true;
      }).map((item)=>SITE+highlightPath(item.id,item.title));
      cachedHlXml=buildHighlightsXml(urls);cachedHlAt=Date.now();
      return res.status(200).send(cachedHlXml);
    }catch(error){
      console.error('Highlights sitemap lookup failed',error?.message||'unknown');
      if(cachedHlXml && Date.now()-cachedHlAt<CACHE_TTL)return res.status(200).send(cachedHlXml);
      return res.status(200).send(buildHighlightsXml([SITE+'/']));
    }
  }
  try{
    const articles=await listPublicArticles(20);
    const seen=new Set();
    const urls=articles.filter((item)=> {
      if(!item.id || !String(item.title||'').trim() || String(item.content||item.body||'').trim().length<450 || seen.has(item.id))return false;
      seen.add(item.id);return true;
    }).map((item)=>SITE+articlePath(item.id,item.title));
    cachedXml=buildXml(urls);cachedAt=Date.now();
    return res.status(200).send(cachedXml);
  }catch(error){
    console.error('Article sitemap lookup failed',error?.message||'unknown');
    if(cachedXml && Date.now()-cachedAt<CACHE_TTL)return res.status(200).send(cachedXml);
    return res.status(200).send(buildXml([SITE+'/articles']));
  }
}
