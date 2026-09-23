import { escapeHtml as h, getPublicFile, listApprovedReviews, resourcePath, SITE, slugFor, validId } from './resource-data.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const id = String(req.query?.id || '');
  if (!validId(id)) return res.status(404).send('Resource not found');
  try {
    const file = await getPublicFile(id);
    if (!file) return res.status(404).send('Resource not found');
    const name = String(file.name || file.title || 'Study resource').slice(0, 180);
    const subject = String(file.subject || 'General').slice(0, 120);
    const description = String(file.description || '').trim().slice(0, 3500);
    const slug = slugFor(name);
    const path = resourcePath(id, name);
    if (req.query?.slug !== slug) return res.redirect(301, path);
    const canonical = SITE + path;
    const title = name + ' | ' + subject + ' VU Study Material | EduNexus';
    const summary = description || ('Preview and download ' + name + ' for ' + subject + ' in the EduNexus Academic Hub.');
    const reviews = await listApprovedReviews(id);
    const appUrl = '/?page=academic&file=' + encodeURIComponent(id);
    const reviewUrl = appUrl + '&panel=reviews';
    const downloadLink = file.sourceType === 'supabase-storage' && file.storageBucket === 'edunexus-public-files'
      ? '<a class="button secondary" href="/api/resource-download?id=' + encodeURIComponent(id) + '">Download file</a>' : '';
    const schema = JSON.stringify({
      '@context':'https://schema.org', '@type':'LearningResource', name, description:summary,
      url:canonical, educationalUse:'revision', learningResourceType:'study material',
      about:subject, inLanguage:'en', isAccessibleForFree:true,
      provider:{ '@type':'Organization', name:'EduNexus', url:SITE }
    }).replace(/</g, '\\u003c');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><meta name="description" content="${h(summary.slice(0, 160))}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${h(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="EduNexus"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(summary.slice(0, 190))}"><meta property="og:url" content="${h(canonical)}"><script type="application/ld+json">${schema}</script><style>:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color-scheme:light}body{margin:0;background:#f5f7ff;color:#172036;line-height:1.65}header{background:#192030;color:white;padding:20px max(20px,calc((100% - 950px)/2))}header a{color:#cbd5ff;font-weight:800;text-decoration:none}main{max-width:950px;margin:30px auto;padding:0 20px}article,.reviews{background:white;border:1px solid #dce1f0;border-radius:19px;padding:clamp(20px,4vw,38px);box-shadow:0 12px 30px -24px #253366}h1{line-height:1.28;overflow-wrap:anywhere}p{white-space:pre-wrap;overflow-wrap:anywhere}.meta{color:#555ec6;font-size:.88rem;font-weight:700}.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0}.button{background:#5147db;color:white;text-decoration:none;padding:11px 17px;border-radius:10px;font-weight:700}.secondary{background:#25314e}.reviews{margin-top:20px}.review{border-top:1px solid #e5e7f0;padding:10px 0}.review p{white-space:pre-wrap}footer{max-width:950px;margin:30px auto;padding:0 20px;color:#5d6684}</style></head><body><header><a href="/">EduNexus</a> · <a href="/vu-notes">Academic Hub</a></header><main><article><div class="meta">${h(subject)} · ${h(String(file.ext || 'Study file').toUpperCase().slice(0, 12))}</div><h1>${h(name)}</h1><p>${h(summary)}</p><div class="buttons"><a class="button" href="${h(appUrl)}">Preview this file on EduNexus</a>${downloadLink}<a class="button secondary" href="${h(reviewUrl)}">Read and write reviews</a></div><p>EduNexus is an independent student learning platform. Check your current course requirements against official sources.</p></article><section class="reviews"><h2>Student reviews${reviews.length ? ' (' + reviews.length + ')' : ''}</h2>${reviews.length ? reviews.map((review) => '<div class="review"><strong>Student review · ' + h(String(review.rating || '')) + '/5 stars</strong><p>' + h(String(review.comment || '').slice(0, 2500)) + '</p></div>').join('') : '<p>No published reviews yet. Open this resource in EduNexus to share your experience.</p>'}<a href="${h(reviewUrl)}">View complete reviews in Academic Hub</a></section></main><footer>© EduNexus · Independent student study resources</footer></body></html>`);
  } catch (error) {
    console.error('Resource page lookup failed', error?.message || 'unknown');
    return res.status(503).send('This resource is temporarily unavailable. Please try again shortly.');
  }
}
