import { listPublicFiles, resourcePath, SITE, escapeHtml } from './resource-data.mjs';
import { guideForFile } from './subject-guides.mjs';

export const maxDuration = 60;
// In-memory cache: survives Firestore quota outages so Googlebot never gets a 503.
let cachedXml = null;
let cachedAt = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function buildXml(urls) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => '<url><loc>' + escapeHtml(url) + '</loc></url>').join('\n') +
    '\n</urlset>';
}

// Keep the sitemap focused on pages that add publisher value beyond a file
// name + download button. Thin files remain accessible in Academic Hub but do
// not compete with richer guides/articles in Search or site-quality review.
function isIndexableFile(file) {
  const description = String(file?.description || '').replace(/\s+/g, ' ').trim();
  const hasEditorialDescription = description.length >= 160;
  const hasOriginalGuideContext = Boolean(guideForFile(file || {}));
  const hasStudentFeedback = Number(file?.ratingCount || 0) > 0;
  return Boolean(file?.id) && (hasEditorialDescription || hasOriginalGuideContext || hasStudentFeedback);
}

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.status(200).end();
  try {
    const files = await listPublicFiles(100);
    const unique = new Map();
    for (const file of files) if (isIndexableFile(file)) unique.set(file.id, file);
    const urls = [...unique.values()].map((file) => SITE + resourcePath(file.id, file.name || file.title));
    cachedXml = buildXml(urls);
    cachedAt = Date.now();
    return res.status(200).send(cachedXml);
  } catch (error) {
    console.error('Resource sitemap failed', error?.message || 'unknown');
    // Serve stale cache instead of 503 — Googlebot hates errors.
    if (cachedXml && Date.now() - cachedAt < CACHE_TTL) {
      return res.status(200).send(cachedXml);
    }
    // Last resort: minimal valid sitemap so the URL never 503s.
    return res.status(200).send(buildXml([SITE + '/']));
  }
}
