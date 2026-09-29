// src/db/highlights.js — campus highlights adapter.
//
// Firestore today:  artifacts/edunexus-live/public/data/highlights
// Postgres target:  highlights (plan §1 table 4).
//
// Field note: today's Firestore field is `desc`; plan §1 names the column
// `text`. The adapter maps desc <-> text on the Supabase branch.

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, getCountFromServer,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCached, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const HIGHLIGHTS = () => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'highlights');
const CACHE_PREFIX = 'highlights_';

const HIGHLIGHT_SPEC = {
  title: 'title',
  desc: 'text',
  text: 'text',
  link: 'link_url',
  linkUrl: 'link_url',
  sortOrder: 'sort_order',
  isActive: 'is_active',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
  // Rich presentation fields live inside the existing `extra` JSONB column
  // on Supabase; Firestore keeps its existing top-level fields.
  iconName: null,
  color: null,
  imageUrl: null,
  videoUrl: null,
};
const HIGHLIGHT_REV = invertSpec(HIGHLIGHT_SPEC);
const toHighlightRow = (data) => {
  const row = toRow(data, HIGHLIGHT_SPEC);
  const rich = {};
  ['iconName', 'color', 'imageUrl', 'videoUrl'].forEach((key) => {
    if (data[key] !== undefined) rich[key] = data[key] || '';
  });
  if (Object.keys(rich).length) row.extra = { ...(data.extra || {}), ...rich };
  return row;
};
const toHighlight = (row) => fromRow(row, HIGHLIGHT_REV, (out, r) => {
  out.desc = r.text ?? out.desc;
  const extra = r.extra && typeof r.extra === 'object' ? r.extra : {};
  out.iconName = extra.iconName || out.iconName || '';
  out.color = extra.color || out.color || '';
  out.imageUrl = extra.imageUrl || out.imageUrl || '';
  out.videoUrl = extra.videoUrl || out.videoUrl || '';
});

export async function listHighlights({ activeOnly = true, limit: max = 100 } = {}) {
  const key = CACHE_PREFIX + (activeOnly ? 'active' : 'all') + '|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        let q = supabase.from('highlights').select('*');
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q.order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toHighlight);
      },
      async () => {
        const snap = await getDocs(query(HIGHLIGHTS(), orderBy('createdAt', 'desc'), limit(max)));
        let items = snap.docs.map(fbItem);
        if (activeOnly) items = items.filter((h) => h.isActive !== false);
        return items;
      },
      { cacheKeys: ['highlights_'] }
    );});
}

export async function getHighlight(id) {
  const key = CACHE_PREFIX + 'one|' + id;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('highlights').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return toHighlight(data);
      },
      async () => {
        const snap = await getDoc(doc(HIGHLIGHTS(), id));
        return snap.exists() ? fbItem(snap) : null;
      },
      { cacheKeys: ['highlights_'] }
    );});
}

export async function createHighlight(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toHighlightRow(data) };
      if (row.is_active === undefined) row.is_active = true;
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('highlights').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      const ref = await addDoc(HIGHLIGHTS(), { ...rest });
      return ref.id;
    },
    { cacheKeys: ['highlights_'] }
  );
}

export async function updateHighlight(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCached(CACHE_PREFIX + 'one|' + id);
  return withFallback(
    async () => {
      const row = toHighlightRow(data);
      if (row.extra) {
        const { data: current } = await supabase.from('highlights').select('extra').eq('id', id).maybeSingle();
        row.extra = { ...(current?.extra || {}), ...row.extra };
      }
      row.updated_at = nowIso();
      const { error } = await supabase.from('highlights').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(HIGHLIGHTS(), id), { ...rest });
    },
    { cacheKeys: ['highlights_'] }
  );
}

export async function removeHighlight(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('highlights').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(HIGHLIGHTS(), id));
    },
    { cacheKeys: ['highlights_'] }
  );
}

export async function setHighlightActive(id, active) {
  return updateHighlight(id, { isActive: !!active });
}

export function subscribeHighlights({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'highlights',
    onInvalidate: invalidate,
    firebaseQuery: query(HIGHLIGHTS(), orderBy('createdAt', 'desc')),
  });
}

/** Exact count of highlights (dashboard stats). */
export async function countHighlights() {
  return withFallback(
    async () => {
      const { count, error } = await supabase.from('highlights').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return Number(count) || 0;
    },
    async () => {
      const snap = await getCountFromServer(query(HIGHLIGHTS()));
      return Number(snap.data().count) || 0;
    },
    { cacheKeys: ['highlights_'] }
  );
}
