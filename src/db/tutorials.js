// src/db/tutorials.js — tutorials adapter.
//
// Firestore today:  artifacts/edunexus-live/public/data/tutorials
// Postgres target:  tutorials (plan §1 table 8).

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCached, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const TUTORIALS = () => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'tutorials');
const CACHE_PREFIX = 'tutorials_';

const TUTORIAL_SPEC = {
  title: 'title',
  category: 'category',
  description: 'description',
  type: 'type', // 'youtube' | 'link' | 'file'
  url: 'url',
  videoId: 'video_id',
  fileName: 'file_name',
  contentType: 'content_type',
  createdBy: 'created_by',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
  // TODO(schema): plan §1 has no columns for `storagePath` and `updatedBy`.
  // File-type tutorials store the video bytes in the `tutorial-videos` bucket;
  // keep `storagePath` in the bucket path column decision before cutover.
  storagePath: null,
  updatedBy: null,
};
const TUTORIAL_REV = invertSpec(TUTORIAL_SPEC);
const toTutorialRow = (data) => toRow(data, TUTORIAL_SPEC);
const toTutorial = (row) => fromRow(row, TUTORIAL_REV);

export async function listTutorials({ limit: max = 100 } = {}) {
  const key = CACHE_PREFIX + 'all|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('tutorials').select('*')
          .order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toTutorial);
      },
      async () => {
        const snap = await getDocs(query(TUTORIALS(), orderBy('createdAt', 'desc'), limit(max)));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['tutorials_'] }
    );});
}

export async function getTutorial(id) {
  const key = CACHE_PREFIX + 'one|' + id;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('tutorials').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return toTutorial(data);
      },
      async () => {
        const snap = await getDoc(doc(TUTORIALS(), id));
        return snap.exists() ? fbItem(snap) : null;
      },
      { cacheKeys: ['tutorials_'] }
    );});
}

export async function createTutorial(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toTutorialRow(data) };
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('tutorials').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      const ref = await addDoc(TUTORIALS(), { ...rest });
      return ref.id;
    },
    { cacheKeys: ['tutorials_'] }
  );
}

export async function updateTutorial(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCached(CACHE_PREFIX + 'one|' + id);
  return withFallback(
    async () => {
      const row = toTutorialRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('tutorials').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(TUTORIALS(), id), { ...rest });
    },
    { cacheKeys: ['tutorials_'] }
  );
}

export async function removeTutorial(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('tutorials').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(TUTORIALS(), id));
    },
    { cacheKeys: ['tutorials_'] }
  );
}

export function subscribeTutorials({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'tutorials',
    onInvalidate: invalidate,
    firebaseQuery: query(TUTORIALS(), orderBy('createdAt', 'desc')),
  });
}
