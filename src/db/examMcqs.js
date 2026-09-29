// src/db/examMcqs.js — exam MCQ bank adapter.
//
// Firestore today: artifacts/edunexus-live/public/data/examMcqs
// Postgres target: exam_mcqs (plan §1 table 16).

import {
  col, doc, getDocs, addDoc, updateDoc,
  query, where, limit, writeBatch, getCountFromServer, serverTimestamp,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCachedPrefix,
  withFallback,
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
    return withFallback(
      async () => {
        let q = supabase.from('exam_mcqs').select('*');
        if (subject) q = q.eq('subject', subject);
        if (term) q = q.eq('term', term);
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toMcq);
      },
      async () => {
        const parts = [];
        if (subject) parts.push(where('subject', '==', subject));
        if (term) parts.push(where('term', '==', term));
        parts.push(limit(max));
        const snap = await getDocs(query(MCQS(), ...parts));
        let items = snap.docs.map(fbItem);
        if (activeOnly) items = items.filter((m) => m.isActive !== false);
        return items;
      },
      { cacheKeys: ['exam_mcqs_'] }
    );});
}

/** MCQs of one import batch (ExamMcqAdminManager "delete whole file" flow). */
export async function listMcqsByBatch(batchId, { limit: max = 1000 } = {}) {
  const key = mcqCacheKey(['batch', batchId, max]);
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('exam_mcqs').select('*')
          .eq('import_batch_id', batchId).limit(max);
        if (error) throw error;
        return (data || []).map(toMcq);
      },
      async () => {
        const snap = await getDocs(query(MCQS(), where('importBatchId', '==', batchId), limit(max)));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['exam_mcqs_'] }
    );});
}

/** MCQs of one source file within a subject (legacy importer grouping). */
export async function listMcqsBySource(subject, fileName, { limit: max = 1000 } = {}) {
  const key = mcqCacheKey(['source', subject, fileName, max]);
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('exam_mcqs').select('*')
          .eq('subject', subject).eq('source_file_name', fileName).limit(max);
        if (error) throw error;
        return (data || []).map(toMcq);
      },
      async () => {
        const snap = await getDocs(query(
          MCQS(), where('subject', '==', subject), where('sourceFileName', '==', fileName), limit(max)));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['exam_mcqs_'] }
    );});
}

/** Publish a single MCQ (ExamPrepHub "Add an MCQ"). Returns the id. */
export async function addMcq(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toMcqRow(data) };
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('exam_mcqs').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const ref = await addDoc(MCQS(), { ...data });
      return ref.id;
    },
    { cacheKeys: ['exam_mcqs_'] }
  );
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
  return withFallback(
    async () => {
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
    },
    async () => {
      // Firebase branch: writeBatch, verbatim shape.
      for (let i = 0; i < list.length; i += chunkSize) {
        const batch = writeBatch(db);
        list.slice(i, i + chunkSize).forEach((r) => {
          const ref = r.id ? doc(MCQS(), r.id) : doc(col('examMcqs'));
          const { id: _drop, ...rest } = r;
          batch.set(ref, { ...rest });
          ids.push(ref.id);
        });
        await batch.commit();
      }
      return { inserted: list.length, ids };
    },
    { cacheKeys: ['exam_mcqs_'] }
  );
}

export async function deleteMcqs(ids, { chunkSize = 450 } = {}) {
  clearCachedPrefix(CACHE_PREFIX);
  const list = Array.isArray(ids) ? ids : [];
  return withFallback(
    async () => {
      for (let i = 0; i < list.length; i += chunkSize) {
        const { error } = await supabase.from('exam_mcqs').delete().in('id', list.slice(i, i + chunkSize));
        if (error) throw error;
      }
      return;
    },
    async () => {
      const firestoreDb = db;
      for (let i = 0; i < list.length; i += chunkSize) {
        const batch = writeBatch(firestoreDb);
        list.slice(i, i + chunkSize).forEach((id) => batch.delete(doc(MCQS(), id)));
        await batch.commit();
      }
    },
    { cacheKeys: ['exam_mcqs_'] }
  );
}

export async function updateMcq(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const row = toMcqRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('exam_mcqs').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await updateDoc(doc(MCQS(), id), { ...data });
    },
    { cacheKeys: ['exam_mcqs_'] }
  );
}

/** Exact count for a subject/term (examCatalogCounts). */
export async function countMcqs(subject, term) {
  return withFallback(
    async () => {
      let q = supabase.from('exam_mcqs').select('id', { count: 'exact', head: true });
      if (subject) q = q.eq('subject', subject);
      if (term) q = q.eq('term', term);
      const { count, error } = await q;
      if (error) throw error;
      return Number(count) || 0;
    },
    async () => {
      const parts = [];
      if (subject) parts.push(where('subject', '==', subject));
      if (term) parts.push(where('term', '==', term));
      const snap = await getCountFromServer(query(MCQS(), ...parts));
      return Number(snap.data().count) || 0;
    },
    { cacheKeys: ['exam_mcqs_'] }
  );
}

/** Activate/disable MCQs in chunks (ExamMcqAdminManager toggle flow). */
export async function setMcqActive(ids, active, { chunkSize = 450 } = {}) {
  clearCachedPrefix(CACHE_PREFIX);
  const list = Array.isArray(ids) ? ids : [];
  return withFallback(
    async () => {
      for (let i = 0; i < list.length; i += chunkSize) {
        const { error } = await supabase.from('exam_mcqs')
          .update({ is_active: !!active, updated_at: nowIso() })
          .in('id', list.slice(i, i + chunkSize));
        if (error) throw error;
      }
      return;
    },
    async () => {
      const firestoreDb = db;
      for (let i = 0; i < list.length; i += chunkSize) {
        const batch = writeBatch(firestoreDb);
        list.slice(i, i + chunkSize).forEach((id) =>
          batch.update(doc(MCQS(), id), { isActive: !!active, updatedAt: serverTimestamp() }));
        await batch.commit();
      }
    },
    { cacheKeys: ['exam_mcqs_'] }
  );
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
