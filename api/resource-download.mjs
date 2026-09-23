import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getPublicFile, validId } from './resource-data.mjs';

// Only administrator-uploaded, intentionally public Supabase objects can be proxied.
// No user-supplied host or arbitrary URL is ever fetched by this endpoint.
export const maxDuration = 60;
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  const id = String(req.query?.id || '');
  if (!validId(id)) return res.status(404).end();
  try {
    const file = await getPublicFile(id);
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
    console.error('Resource download failed', error?.message || 'unknown');
    if (!res.headersSent) return res.status(502).end('Download temporarily unavailable');
    res.destroy();
  }
}
