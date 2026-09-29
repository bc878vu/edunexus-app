// src/db/announcements.js — announcements ticker adapter.
//
// Firestore today:  artifacts/edunexus-live/public/data/announcements
// Postgres target:  announcements (plan §1 table 1).
//
// Field note: today's Firestore field is `content`; plan §1 names the column
// `body`. The adapter maps content <-> body on the Supabase branch.

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCached, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const ANNOUNCEMENTS = () => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'announcements');
const CACHE_PREFIX = 'announcements_';

const ANNOUNCEMENT_SPEC = {
  title: 'title',
  content: 'body',
  body: 'body',
  link: 'link_url',
  linkUrl: 'link_url',
  isActive: 'is_active',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
};
const ANNOUNCEMENT_REV = invertSpec(ANNOUNCEMENT_SPEC);
const toAnnouncementRow = (data) => toRow(data, ANNOUNCEMENT_SPEC);
const toAnnouncement = (row) => fromRow(row, ANNOUNCEMENT_REV, (out, r) => {
  out.content = r.body ?? out.content;
});

export async function listAnnouncements({ activeOnly = true, limit: max = 50 } = {}) {
  const key = CACHE_PREFIX + (activeOnly ? 'active' : 'all') + '|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        let q = supabase.from('announcements').select('*');
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toAnnouncement);
      },
      async () => {
        const snap = await getDocs(query(ANNOUNCEMENTS(), orderBy('createdAt', 'desc'), limit(max)));
        let items = snap.docs.map(fbItem);
        if (activeOnly) items = items.filter((a) => a.isActive !== false);
        return items;
      },
      { cacheKeys: ['announcements_'] }
    );});
}

export async function getAnnouncement(id) {
  const key = CACHE_PREFIX + 'one|' + id;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return toAnnouncement(data);
      },
      async () => {
        const snap = await getDoc(doc(ANNOUNCEMENTS(), id));
        return snap.exists() ? fbItem(snap) : null;
      },
      { cacheKeys: ['announcements_'] }
    );});
}

export async function createAnnouncement(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toAnnouncementRow(data) };
      if (row.is_active === undefined) row.is_active = true;
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('announcements').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      const ref = await addDoc(ANNOUNCEMENTS(), { ...rest });
      return ref.id;
    },
    { cacheKeys: ['announcements_'] }
  );
}

export async function updateAnnouncement(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCached(CACHE_PREFIX + 'one|' + id);
  return withFallback(
    async () => {
      const row = toAnnouncementRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('announcements').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(ANNOUNCEMENTS(), id), { ...rest });
    },
    { cacheKeys: ['announcements_'] }
  );
}

export async function removeAnnouncement(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(ANNOUNCEMENTS(), id));
    },
    { cacheKeys: ['announcements_'] }
  );
}

export async function setAnnouncementActive(id, active) {
  return updateAnnouncement(id, { isActive: !!active });
}

export function subscribeAnnouncements({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'announcements',
    onInvalidate: invalidate,
    firebaseQuery: query(ANNOUNCEMENTS(), orderBy('createdAt', 'desc')),
  });
}
