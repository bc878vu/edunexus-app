import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getPublicFile, validId } from './resource-data.mjs';

// In-memory cache for file metadata: id -> { file, fetchedAt }.
// Download endpoints get hit repeatedly for the same file; caching the
// Firestore metadata lookup (5 min TTL) cuts Firestore reads dramatically.
const metaCache = new Map();
const META_TTL_MS = 5 * 60 * 1000;

async function getCachedFile(id) {
  const now = Date.now();
  const cached = metaCache.get(id);
  if (cached && (now - cached.fetchedAt) < META_TTL_MS) return cached.file;
  const file = await getPublicFile(id);
  // Cache both hits and misses (null) to avoid hammering Firestore on bad ids.
  metaCache.set(id, { file, fetchedAt: now });
  // Bound cache size to avoid unbounded memory growth.
  if (metaCache.size > 500) {
    const oldest = metaCache.keys().next().value;
    metaCache.delete(oldest);
  }
  return file;
}

// Only administrator-uploaded, intentionally public Supabase objects can be proxied.
// No user-supplied host or arbitrary URL is ever fetched by this endpoint.
export const maxDuration = 60;
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  const id = String(req.query?.id || '');
  if (!validId(id)) return res.status(404).end();
  try {
    const file = await getCachedFile(id);
    if (!file || file.sourceType !== 'supabase-storage' || file.storageBucket !== 'edunexus-public-files')
      return res.status(404).end();
    const segments = String(file.storagePath || '').split('/');
    if (!segments.length || segments.length > 12 || !segments.every((part) =>
      /^[A-Za-z0-9._-]{1,150}$/.test(part) && part !== '.' && part !== '..')) return res.status(404).end();
    const upstreamUrl = 'https://cprpndovdfnkvekewstv.supabase.co/storage/v1/object/public/edunexus-public-files/' +
      segments.map(encodeURIComponent).join('/');
    const headers = {};
    if (typeof req.headers.range === 'string' && /^bytes=\d*-\d*$/.test(req.headers.range)) headers.Range = req.headers.range;
    const response = await fetch(upstreamUrl, { method: req.method, headers, redirect: 'error' });
    if (![200, 206].includes(response.status)) return res.status(response.status === 404 ? 404 : 502).end();
    const filename = String(file.originalFilename || file.name || 'resource').replace(/[\r\n/"\\]/g, '_').slice(0, 120);
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(filename));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    for (const key of ['content-length', 'content-range', 'accept-ranges', 'etag']) {
      const value = response.headers.get(key);
      if (value) res.setHeader(key, value);
    }
    if (req.method === 'HEAD' || !response.body) return res.end();
    await pipeline(Readable.fromWeb(response.body), res);
  } catch (error) {
    const msg = String(error?.message || 'unknown');
    console.error('Resource download failed', msg);
    if (!res.headersSent) {
      // Firestore quota exceeded -> tell the client to retry later (429, not 502).
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg))
        return res.status(429).end('Download quota exceeded, please try again later');
      return res.status(502).end('Download temporarily unavailable');
    }
    res.destroy();
  }
}
