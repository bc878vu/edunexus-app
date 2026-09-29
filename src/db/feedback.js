// src/db/feedback.js — feedback inbox adapter.
//
// Firestore today:  artifacts/edunexus-live/public/data/feedback
// Postgres target:  feedback (plan §1 table 12).
//
// Field note: today's contact form writes `msg`; exam-review reports write
// `reason` + `reviewId`/`reviewCollection`. Both map onto the feedback table.

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch, serverTimestamp,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCached, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const FEEDBACK = () => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'feedback');
const CACHE_PREFIX = 'feedback_';

const FEEDBACK_SPEC = {
  userId: 'user_id',
  name: 'name',
  email: 'email',
  msg: 'message',
  message: 'message',
  category: 'category',
  reviewId: 'review_id',
  reviewCollection: 'review_collection',
  reason: 'reason',
  read: 'is_read',
  isRead: 'is_read',
  createdAt: { col: 'created_at', ts: true },
  // TODO(schema): plan §1 has no `read_at` column; read timestamps are dropped
  // on the Supabase branch (only the is_read flag is kept).
  readAt: null,
};
const FEEDBACK_REV = invertSpec(FEEDBACK_SPEC);
const toFeedbackRow = (data) => toRow(data, FEEDBACK_SPEC);
const toFeedback = (row) => fromRow(row, FEEDBACK_REV, (out, r) => {
  out.msg = r.message ?? out.msg;      // App.js inbox reads `msg`
  out.read = r.is_read ?? out.read;    // App.js inbox reads `read`
});

/** Admin inbox, newest first. */
export async function listFeedback({ limit: max = 50, category } = {}) {
  const key = CACHE_PREFIX + (category || 'all') + '|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        let q = supabase.from('feedback').select('*');
        if (category) q = q.eq('category', category);
        const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toFeedback);
      },
      async () => {
        const parts = [];
        if (category) parts.push(where('category', '==', category));
        parts.push(orderBy('createdAt', 'desc'), limit(max));
        const snap = await getDocs(query(FEEDBACK(), ...parts));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['feedback_'] }
    );});
}

export async function getFeedback(id) {
  const key = CACHE_PREFIX + 'one|' + id;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('feedback').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return toFeedback(data);
      },
      async () => {
        const snap = await getDoc(doc(FEEDBACK(), id));
        return snap.exists() ? fbItem(snap) : null;
      },
      { cacheKeys: ['feedback_'] }
    );});
}

/** Contact form + report flows. Returns the id. */
export async function createFeedback(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toFeedbackRow(data) };
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('feedback').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      const ref = await addDoc(FEEDBACK(), { ...rest });
      return ref.id;
    },
    { cacheKeys: ['feedback_'] }
  );
}

export async function updateFeedback(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCached(CACHE_PREFIX + 'one|' + id);
  return withFallback(
    async () => {
      const { error } = await supabase.from('feedback').update(toFeedbackRow(data)).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(FEEDBACK(), id), { ...rest });
    },
    { cacheKeys: ['feedback_'] }
  );
}

/** Admin: mark a message read/unread (App.js inbox uses read:true + readAt). */
export async function markFeedbackRead(id, read = true) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('feedback')
        .update({ is_read: !!read }).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await updateDoc(doc(FEEDBACK(), id), read
        ? { read: true, readAt: serverTimestamp() }
        : { read: false, readAt: null });
    },
    { cacheKeys: ['feedback_'] }
  );
}

/** Admin: mark every id in the list as read (App.js "Mark all read"). */
export async function markAllFeedbackRead(ids) {
  clearCachedPrefix(CACHE_PREFIX);
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return;
  return withFallback(
    async () => {
      const { error } = await supabase.from('feedback')
        .update({ is_read: true }).in('id', list);
      if (error) throw error;
      return;
    },
    async () => {
      const batch = writeBatch(db);
      list.forEach((id) => batch.update(doc(FEEDBACK(), id), { read: true, readAt: serverTimestamp() }));
      await batch.commit();
    },
    { cacheKeys: ['feedback_'] }
  );
}

export async function deleteFeedback(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('feedback').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(FEEDBACK(), id));
    },
    { cacheKeys: ['feedback_'] }
  );
}

export function subscribeFeedback({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'feedback',
    onInvalidate: invalidate,
    firebaseQuery: query(FEEDBACK(), orderBy('createdAt', 'desc'), limit(50)),
  });
}
