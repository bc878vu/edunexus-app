import { SITE } from '../src/site-seo.mjs';
export { SITE };
// Public Firestore REST reads only. Never put service-account keys in browser code.
const PROJECT = 'edunexus-live-e0b84';
const API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8';
const ROOT = 'artifacts/edunexus-live/public/data/files';
const ENDPOINT = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/';

// ===== Supabase/PostgREST backend (feature-flagged; default stays Firestore) =====
const USE_SUPABASE = process.env.DATA_BACKEND === 'supabase';
const SUPABASE_URL = 'https://cprpndovdfnkvekewstv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'PASTE_FULL_PUBLISHABLE_KEY_HERE';
const POSTGREST = SUPABASE_URL + '/rest/v1';
const postgrestHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
// PostgREST rows are snake_case; convert to the camelCase shape the SEO pages expect.
const toCamel = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    out[String(key).replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase())] = val;
  }
  return out;
};
const postgrestGet = (table, params) => getJson(POSTGREST + '/' + table + '?' + params, postgrestHeaders);

export const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const slugFor = (name) => String(name || 'study-resource').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'study-resource';
export const resourcePath = (id, name) => '/vu-notes/file/' + encodeURIComponent(id) + '/' + slugFor(name);
const endpoint = (path) => ENDPOINT + path + '?key=' + encodeURIComponent(API_KEY);
function fieldValue(field) {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  return null;
}
export function decodeDoc(doc) {
  const item = { id: String(doc?.name || '').split('/').pop() };
  for (const [key, val] of Object.entries(doc?.fields || {})) item[key] = fieldValue(val);
  return item;
}
async function getJson(url, extraHeaders) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json', ...(extraHeaders || {}) } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Public resource lookup failed: HTTP ' + response.status);
    return await response.json();
  } finally { clearTimeout(timeout); }
}
export async function getPublicFile(id) {
  if (!validId(id)) return null;
  if (USE_SUPABASE) {
    const rows = await postgrestGet('files', 'select=*&id=eq.' + encodeURIComponent(id) + '&limit=1');
    return rows && rows[0] ? toCamel(rows[0]) : null;
  }
  const doc = await getJson(endpoint(ROOT + '/' + encodeURIComponent(id)));
  return doc ? decodeDoc(doc) : null;
}
export async function listPublicFiles(maxPages = 30) {
  if (USE_SUPABASE) {
    const result = [];
    for (let i = 0; i < maxPages; i += 1) {
      const rows = await postgrestGet('files', 'select=*&order=created_at.desc&limit=100&offset=' + (i * 100));
      if (!rows || rows.length === 0) break;
      result.push(...rows.map(toCamel));
      if (rows.length < 100) break;
    }
    return result;
  }
  const result = []; let token = '';
  for (let i = 0; i < maxPages; i += 1) {
    const url = new URL(ENDPOINT + ROOT);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('pageSize', '100');
    if (token) url.searchParams.set('pageToken', token);
    const json = await getJson(url.href);
    if (!json) break;
    result.push(...(json.documents || []).map(decodeDoc));
    token = json.nextPageToken || '';
    if (!token) break;
  }
  return result;
}
// Each page shows complete, unabridged reviews. Pagination prevents very long
// user submissions from producing unbounded HTML and keeps all pages crawlable.
export async function listApprovedReviews(id, page = 1, pageSize = 20) {
  if (!validId(id) || !Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return { items: [], hasMore: false };
  }
  if (USE_SUPABASE) {
    const rows = await postgrestGet('file_reviews',
      'select=*&file_id=eq.' + encodeURIComponent(id) +
      '&status=eq.approved&order=created_at.desc&limit=' + (pageSize + 1) +
      '&offset=' + ((page - 1) * pageSize));
    const items = (rows || []).map(toCamel);
    return { items: items.slice(0, pageSize), hasMore: items.length > pageSize };
  }
  const queryUrl = ENDPOINT + ROOT + '/' + encodeURIComponent(id) + ':runQuery?key=' + encodeURIComponent(API_KEY);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const structuredQuery = {
      from: [{ collectionId: 'reviews' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } } },
      limit: pageSize + 1
    };
    if (page > 1) structuredQuery.offset = (page - 1) * pageSize;
    const response = await fetch(queryUrl, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ structuredQuery })
    });
    if (!response.ok) throw new Error('Public review query failed: HTTP ' + response.status);
    const rows = (await response.json()).filter((row) => row.document).map((row) => decodeDoc(row.document));
    return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  } finally { clearTimeout(timer); }
}

const ARTICLES = 'artifacts/edunexus-live/public/data/articles';
export const articlePath = (id, title) => '/articles/read/' + encodeURIComponent(id) + '/' + slugFor(title);
export async function getPublicArticle(id) {
  if (!validId(id)) return null;
  if (USE_SUPABASE) {
    const rows = await postgrestGet('articles', 'select=*&id=eq.' + encodeURIComponent(id) + '&limit=1');
    return rows && rows[0] ? toCamel(rows[0]) : null;
  }
  const doc = await getJson(endpoint(ARTICLES + '/' + encodeURIComponent(id)));
  return doc ? decodeDoc(doc) : null;
}
export async function listPublicArticles(maxPages = 10) {
  if (USE_SUPABASE) {
    const result = [];
    for (let i = 0; i < maxPages; i += 1) {
      const rows = await postgrestGet('articles', 'select=*&order=created_at.desc&limit=100&offset=' + (i * 100));
      if (!rows || rows.length === 0) break;
      result.push(...rows.map(toCamel));
      if (rows.length < 100) break;
    }
    return result;
  }
  const result = []; let token = '';
  for (let i = 0; i < maxPages; i += 1) {
    const url = new URL(ENDPOINT + ARTICLES);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('pageSize','100');
    if (token) url.searchParams.set('pageToken', token);
    const json = await getJson(url.href);
    if (!json) break;
    result.push(...(json.documents || []).map(decodeDoc));
    token = json.nextPageToken || '';
    if (!token) break;
  }
  return result;
}
