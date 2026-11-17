// src/db/examMcqs.js — exam MCQ bank adapter.
//
// Postgres: exam_mcqs (plan §1 table 16).
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).

import {
  col, query, where,
  supabase, USE_SUPABASE,
  nowIso, newId, toRow, fromRow, invertSpec,
  cachedList, clearCachedPrefix,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const MCQS = () => col('examMcqs');
const CACHE_PREFIX = 'exam_mcqs_';

const MCQ_SPEC = {
  subject: 'subject',
  term: 'term',
  question: 'question',
  options: 'options', // text[4]
  answer: 'answer',   // 0-3
  explanation: 'explanation',
  importBatchId: 'import_batch_id',
  sourceFileName: 'source_file_name',
  isActive: 'is_active',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
};
const MCQ_REV = invertSpec(MCQ_SPEC);
const toMcqRow = (data) => toRow(data, MCQ_SPEC);
const toMcq = (row) => fromRow(row, MCQ_REV);

const mcqCacheKey = (parts) => CACHE_PREFIX + parts.join('|');

/** List MCQs for a subject/term (practice play, admin manager). */
export async function listMcqs({ subject, term, limit: max = 1000, activeOnly = true } = {}) {
  const key = mcqCacheKey(['list', subject || '-', term || '-', max, activeOnly ? 'a' : 'all']);
  return cachedList(key, async () => {
    let q = supabase.from('exam_mcqs').select('*');
    if (subject) q = q.eq('subject', subject);
    if (term) q = q.eq('term', term);
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
    if (error) throw error;
    return (data || []).map(toMcq);
  });
}

/** MCQs of one import batch (ExamMcqAdminManager "delete whole file" flow). */
export async function listMcqsByBatch(batchId, { limit: max = 1000 } = {}) {
  const key = mcqCacheKey(['batch', batchId, max]);
  return cachedList(key, async () => {
    const { data, error } = await supabase.from('exam_mcqs').select('*')
      .eq('import_batch_id', batchId).limit(max);
    if (error) throw error;
    return (data || []).map(toMcq);
  });
}

/** MCQs of one source file within a subject (legacy importer grouping). */
export async function listMcqsBySource(subject, fileName, { limit: max = 1000 } = {}) {
  const key = mcqCacheKey(['source', subject, fileName, max]);
  return cachedList(key, async () => {
    const { data, error } = await supabase.from('exam_mcqs').select('*')
      .eq('subject', subject).eq('source_file_name', fileName).limit(max);
    if (error) throw error;
    return (data || []).map(toMcq);
  });
}

/** Publish a single MCQ (ExamPrepHub "Add an MCQ"). Returns the id. */
export async function addMcq(data) {
  clearCachedPrefix(CACHE_PREFIX);
  const id = data.id || newId();
  const row = { id, ...toMcqRow(data) };
  if (!row.created_at) row.created_at = nowIso();
  const { error } = await supabase.from('exam_mcqs').insert(row);
  if (error) throw error;
  return id;
}

/**
 * Bulk import (McqBulkImporter). Chunked inserts, 500/chunk.
 * Rows already carry importBatchId / sourceFileName / createdAt.
 * Returns { inserted, ids }.
 */
export async function addMcqBatch(rows, { chunkSize = 500 } = {}) {
  clearCachedPrefix(CACHE_PREFIX);
  const list = Array.isArray(rows) ? rows : [];
  const ids = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize).map((r) => {
      const id = r.id || newId();
      ids.push(id);
      const row = { id, ...toMcqRow(r) };
      if (!row.created_at) row.created_at = nowIso();
      return row;
    });
    const { error } = await supabase.from('exam_mcqs').insert(chunk);
    if (error) throw error;
  }
  return { inserted: list.length, ids };
}

export async function deleteMcqs(ids, { chunkSize = 450 } = {}) {
  clearCachedPrefix(CACHE_PREFIX);
  const list = Array.isArray(ids) ? ids : [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const { error } = await supabase.from('exam_mcqs').delete().in('id', list.slice(i, i + chunkSize));
    if (error) throw error;
  }
}

/** Delete every row of one import batch, by its import_batch_id. */
export async function deleteMcqsByBatch(batchId) {
  clearCachedPrefix(CACHE_PREFIX);
  if (!batchId) throw new Error('No batch selected to delete.');
  const { error } = await supabase.from('exam_mcqs').delete().eq('import_batch_id', batchId);
  if (error) throw error;
}

/**
 * Replace one live import batch with a new set of rows (same subject/term).
 * Insert-first, then delete: the new rows go in under their fresh batch id
 * and are counted; only when the count matches do the old rows go out, so a
 * failed import never loses the live bank. If the old batch changed since the
 * admin listed it (or exceeds 900 rows) the delete is refused and the new
 * batch stays live — the admin then removes the old batch from Manage MCQs.
 * Returns { inserted, deleted, batchId }.
 */
export async function replaceMcqBatch(rows, oldBatchId, { expectedOldCount = null, chunkSize = 500 } = {}) {
  if (!oldBatchId) throw new Error('No batch selected to replace.');
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) throw new Error('Nothing to import for this replacement.');
  const newBatchId = list[0].importBatchId;
  if (!newBatchId) throw new Error('Replacement rows carry no batch id.');
  if (newBatchId === oldBatchId) throw new Error('The replacement batch must differ from the batch it replaces.');
  const result = await addMcqBatch(list, { chunkSize });
  const fresh = await listMcqsByBatch(newBatchId, { limit: list.length + 1 });
  if (fresh.length !== list.length || result.inserted !== list.length) {
    throw new Error('Only ' + fresh.length + ' of ' + list.length + ' replacement questions were published. The old batch is untouched — remove the partial new batch from Manage MCQs and retry.');
  }
  const oldRows = await listMcqsByBatch(oldBatchId, { limit: 901 });
  if (oldRows.length > 900) {
    throw new Error('The old batch has ' + oldRows.length + ' questions (over the 900-row replace limit). The new batch is live; remove the old batch from Manage MCQs.');
  }
  if (expectedOldCount != null && oldRows.length !== expectedOldCount) {
    throw new Error('The old batch changed while it was open (' + oldRows.length + ' questions now, expected ' + expectedOldCount + '). The new batch is live; reload Manage MCQs and remove the old batch there.');
  }
  const deleted = oldRows.length;
  await deleteMcqsByBatch(oldBatchId);
  return { inserted: result.inserted, deleted, batchId: newBatchId };
}

export async function updateMcq(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  const row = toMcqRow(data);
  row.updated_at = nowIso();
  const { error } = await supabase.from('exam_mcqs').update(row).eq('id', id);
  if (error) throw error;
}

/** Exact count for a subject/term (examCatalogCounts). */
export async function countMcqs(subject, term) {
  let q = supabase.from('exam_mcqs').select('id', { count: 'exact', head: true });
  if (subject) q = q.eq('subject', subject);
  if (term) q = q.eq('term', term);
  const { count, error } = await q;
  if (error) throw error;
  return Number(count) || 0;
}

/** Activate/disable MCQs in chunks (ExamMcqAdminManager toggle flow). */
export async function setMcqActive(ids, active, { chunkSize = 450 } = {}) {
  clearCachedPrefix(CACHE_PREFIX);
  const list = Array.isArray(ids) ? ids : [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const { error } = await supabase.from('exam_mcqs')
      .update({ is_active: !!active, updated_at: nowIso() })
      .in('id', list.slice(i, i + chunkSize));
    if (error) throw error;
  }
}

export function subscribeMcqs({ subject, onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  if (USE_SUPABASE) {
    return subscribeTable({
      table: 'exam_mcqs',
      filter: subject ? `subject=eq.${subject}` : undefined,
      onInvalidate: invalidate,
    });
  }
  const parts = [];
  if (subject) parts.push(where('subject', '==', subject));
  return subscribeTable({
    table: 'exam_mcqs',
    onInvalidate: invalidate,
    firebaseQuery: query(MCQS(), ...parts),
  });
}
