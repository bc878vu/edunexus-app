// src/db/files.js — academic library files + meta docs adapter.
//
// Postgres: files, meta_docs (plan §1).
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).

import {
  col, doc, query, where, orderBy, limit,
  supabase, USE_SUPABASE, ROOT, db,
  nowIso, newId, toRow, fromRow, invertSpec,
  escapeIlike, cachedList, clearCached, clearCachedPrefix, CACHE_TTL,
} from './_common.js';
import { subscribeTable, subscribeRow } from './realtime.js';

const FILES = () => col('files');
const META = (id) => doc(db, ...ROOT, 'meta', id);

const CACHE_PREFIX = 'academic_files_';
const SEARCH_PREFIX = 'search_files_';
const META_PREFIX = 'meta_';

// Firestore camelCase -> Postgres snake_case (plan §1 table 5).
// Fields with no Postgres column are dropped on the Supabase branch (TODOs below).
const FILE_SPEC = {
  name: 'name',
  subject: 'subject',
  folder: 'folder',
  category: 'category',
  description: 'description',
  url: 'url',
  ext: 'ext',
  originalFilename: 'original_filename',
  storagePath: 'storage_path',
  sourceType: 'source_type',
  storageBucket: 'storage_bucket',
  isLinkOnly: 'is_link_only',
  size: 'size',
  uploadedBy: 'uploaded_by',
  rightsBasis: 'rights_basis',
  rightsConfirmed: 'rights_confirmed',
  rightsConfirmedAt: { col: 'rights_confirmed_at', ts: true },
  ratingAverage: 'rating_average',
  ratingCount: 'rating_count',
  ratingSummaryUpdatedAt: { col: 'rating_summary_updated_at', ts: true },
  isActive: 'is_active',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
  // TODO(schema): legacy Firestore docs sometimes carry `title` instead of
  // `name`, plus `downloadUrl`/`fileUrl` aliases — none have a Postgres column
  // in plan §1. Decide whether the data migration maps them into `name`/`url`.
};
const FILE_REV = invertSpec(FILE_SPEC);
const toFileRow = (data) => toRow(data, FILE_SPEC);
const toFile = (row) => fromRow(row, FILE_REV);

const fileCacheKey = ({ subject, subjects }) => {
  if (Array.isArray(subjects) && subjects.length) return CACHE_PREFIX + 'multi_' + [...subjects].sort().join(',');
  if (subject) return CACHE_PREFIX + subject;
  return CACHE_PREFIX + 'all';
};

/**
 * List library files.
 * cursor: opaque value returned as `cursor` from a previous call.
 * Returns { items, cursor, hasMore }.
 */
export async function listFiles({
  subject, subjects, folder, limit: pageSize = 60, cursor = null,
  orderBy: orderField = 'createdAt', orderDir = 'desc', activeOnly = true,
} = {}) {
  const key = fileCacheKey({ subject, subjects, folder }) + `|${orderField}|${orderDir}|${pageSize}|` +
    (cursor ? (cursor.id || JSON.stringify(cursor)) : 'first');
  return cachedList(key, async () => {
    const colName = orderField === 'createdAt' ? 'created_at' : orderField;
    let q = supabase.from('files').select('*');
    if (Array.isArray(subjects) && subjects.length) q = q.in('subject', subjects);
    else if (subject) q = q.eq('subject', subject);
    // Legacy folder field (schema TODO: add folder/category columns to files).
    if (folder) q = q.eq('folder', folder);
    if (activeOnly) q = q.eq('is_active', true);
    const asc = orderDir !== 'desc';
    q = q.order(colName, { ascending: asc }).order('id', { ascending: asc });
    if (cursor && colName === 'created_at') {
      // Keyset pagination on (created_at, id).
      const c = cursor.created_at || cursor.createdAt;
      const cmp = asc ? 'gt' : 'lt';
      q = q.or(`created_at.${cmp}.${c},and(created_at.eq.${c},id.${cmp}.${cursor.id})`);
    }
    // TODO: cursor is only honored for createdAt ordering; other orderings
    // restart from the first page.
    const { data, error } = await q.limit(pageSize + 1);
    if (error) throw error;
    const rows = data || [];
    const items = rows.slice(0, pageSize).map(toFile);
    const last = rows[Math.min(rows.length, pageSize) - 1];
    return {
      items,
      cursor: rows.length > pageSize && last ? { created_at: last.created_at, id: last.id } : null,
      hasMore: rows.length > pageSize,
    };
  });
}

export async function getFile(id) {
  const { data, error } = await supabase.from('files').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toFile(data);
}

/** Publish a new file. Returns the new id. */
export async function publishFile(data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCachedPrefix(SEARCH_PREFIX);
  const id = newId();
  const row = { id, ...toFileRow(data) };
  if (!row.created_at) row.created_at = nowIso();
  const { error } = await supabase.from('files').insert(row);
  if (error) throw error;
  return id;
}

export async function updateFile(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCachedPrefix(SEARCH_PREFIX);
  const row = toFileRow(data);
  row.updated_at = nowIso();
  const { error } = await supabase.from('files').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteFile(id) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCachedPrefix(SEARCH_PREFIX);
  const { error } = await supabase.from('files').delete().eq('id', id);
  if (error) throw error;
}

/** List files across multiple subjects (batch). */
export async function listFilesBySubjects(subjects, { limit: max = 400, activeOnly = true } = {}) {
  const wanted = [...new Set((subjects || []).map((v) => String(v || '').trim()).filter(Boolean))];
  if (!wanted.length) return [];
  const key = CACHE_PREFIX + 'bysubjects|' + wanted.slice().sort().join(',') + '|' + max;
  return cachedList(key, async () => {
    const { data, error } = await supabase.from('files').select('*')
      .in('subject', wanted).limit(max);
    if (error) throw error;
    return (data || []).map(toFile).filter((f) => !activeOnly || f.isActive !== false);
  });
}

/** Server-side search (plan §10.1). */
export async function searchFiles(q, { limit: max = 20 } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return [];
  const key = SEARCH_PREFIX + needle + '|' + max;
  return cachedList(key, async () => {
    const pat = `%${escapeIlike(needle)}%`;
    const { data, error } = await supabase.from('files').select('*')
      .eq('is_active', true)
      .or(`name.ilike.${pat},title.ilike.${pat},description.ilike.${pat},subject.ilike.${pat}`)
      .order('created_at', { ascending: false })
      .limit(max);
    // TODO(search): plan §10.1 adds a tsvector column + GIN index; switch this
    // to search_tsv @@ plainto_tsquery once that migration lands.
    if (error) throw error;
    return (data || []).map(toFile);
  }, CACHE_TTL.CATALOG);
}

// ---- meta docs (meta/folders, meta/examCatalog, meta/floatingHub, ...) ----

export async function getMetaDoc(id) {
  const key = META_PREFIX + id;
  return cachedList(key, async () => {
    const { data, error } = await supabase.from('meta_docs').select('data').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  });
}

export async function setMetaDoc(id, data, { merge = true } = {}) {
  clearCached(META_PREFIX + id);
  if (merge) {
    const current = await getMetaDoc(id);
    const { error } = await supabase.from('meta_docs')
      .upsert({ id, data: { ...(current || {}), ...data }, updated_at: nowIso() }, { onConflict: 'id' });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('meta_docs')
    .upsert({ id, data, updated_at: nowIso() }, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Atomically bump meta/folders fileCounts[code] by delta.
 */
export async function bumpFolderCount(code, delta) {
  const c = String(code || '').trim();
  if (!c || !delta) return;
  clearCached(META_PREFIX + 'folders');
  // TODO(atomicity): replace this read-modify-write with a SECURITY DEFINER
  // rpc (e.g. bump_file_count(code, delta)) if concurrent uploads contend.
  const current = (await getMetaDoc('folders')) || {};
  const counts = { ...(current.fileCounts || {}) };
  counts[c] = Math.max(0, Number(counts[c] || 0) + delta);
  const { error } = await supabase.from('meta_docs')
    .upsert({ id: 'folders', data: { ...current, fileCounts: counts }, updated_at: nowIso() }, { onConflict: 'id' });
  if (error) throw error;
  clearCached(META_PREFIX + 'folders');
}

// ---- realtime (onInvalidate only, per plan §7) ----

export function subscribeFiles({ subject, subjects, limit: pageSize = 60, onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  if (USE_SUPABASE) {
    const filter = Array.isArray(subjects) && subjects.length
      ? `subject=in.(${subjects.join(',')})`
      : subject ? `subject=eq.${subject}` : undefined;
    return subscribeTable({ table: 'files', filter, onInvalidate: invalidate });
  }
  let q = FILES();
  const parts = [];
  if (Array.isArray(subjects) && subjects.length) parts.push(where('subject', 'in', subjects.slice(0, 10)));
  else if (subject) parts.push(where('subject', '==', subject));
  parts.push(orderBy('createdAt', 'desc'), limit(pageSize));
  return subscribeTable({ table: 'files', onInvalidate: invalidate, firebaseQuery: query(q, ...parts) });
}

export function subscribeMetaDoc(id, { onInvalidate }) {
  const invalidate = () => { clearCached(META_PREFIX + id); try { onInvalidate(); } catch (_) {} };
  return subscribeRow({
    table: 'meta_docs', id, onInvalidate: invalidate, firebaseDocRef: META(id),
  });
}

/** Exact count of files (dashboard stats). */
export async function countFiles() {
  const { count, error } = await supabase.from('files').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return Number(count) || 0;
}
