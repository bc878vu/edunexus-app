import { listPublicFiles, resourcePath, SITE, escapeHtml } from './resource-data.mjs';

export const maxDuration = 60;
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  try {
    const files = await listPublicFiles(100);
    const unique = new Map();
    for (const file of files) if (file.id) unique.set(file.id, file);
    const urls = [...unique.values()].map((file) => SITE + resourcePath(file.id, file.name || file.title));
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((url) => '<url><loc>' + escapeHtml(url) + '</loc></url>').join('\n') +
      '\n</urlset>');
  } catch (error) {
    console.error('Resource sitemap failed', error?.message || 'unknown');
    return res.status(503).end('Resource sitemap temporarily unavailable');
  }
}
