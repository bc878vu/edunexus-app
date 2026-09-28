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
  // TODO(schema): plan §1 has no columns for the card-display fields
  // iconName, color, imageUrl, videoUrl. They are dropped on the Supabase
  // branch until the table is extended (e.g. an `extra` jsonb column).
  iconName: null,
  color: null,
  imageUrl: null,
  videoUrl: null,
};
const HIGHLIGHT_REV = invertSpec(HIGHLIGHT_SPEC);
const toHighlightRow = (data) => toRow(data, HIGHLIGHT_SPEC);
const toHighlight = (row) => fromRow(row, HIGHLIGHT_REV, (out, r) => {
  out.desc = r.text ?? out.desc;
});

export async function listHighlights({ activeOnly = true, limit: max = 100 } = {}) {
  const key = CACHE_PREFIX + (activeOnly ? 'active' : 'all') + '|' + max;
  return cachedList(key, async () => {
    if (USE_SUPABASE) {
      let q = supabase.from('highlights').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q.order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }).limit(max);
      if (error) throw error;
      return (data || []).map(toHighlight);
    }
    const snap = await getDocs(query(HIGHLIGHTS(), orderBy('createdAt', 'desc'), limit(max)));
    let items = snap.docs.map(fbItem);
    if (activeOnly) items = items.filter((h) => h.isActive !== false);
    return items;
  });
}

export async function getHighlight(id) {
  const key = CACHE_PREFIX + 'one|' + id;
  return cachedList(key, async () => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('highlights').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return toHighlight(data);
    }
    const snap = await getDoc(doc(HIGHLIGHTS(), id));
    return snap.exists() ? fbItem(snap) : null;
  });
}

export async function createHighlight(data) {
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const id = data.id || newId();
    const row = { id, ...toHighlightRow(data) };
    if (row.is_active === undefined) row.is_active = true;
    if (!row.created_at) row.created_at = nowIso();
    const { error } = await supabase.from('highlights').insert(row);
    if (error) throw error;
    return id;
  }
  const { id: _drop, ...rest } = data;
  const ref = await addDoc(HIGHLIGHTS(), { ...rest });
  return ref.id;
}

export async function updateHighlight(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCached(CACHE_PREFIX + 'one|' + id);
  if (USE_SUPABASE) {
    const row = toHighlightRow(data);
    row.updated_at = nowIso();
    const { error } = await supabase.from('highlights').update(row).eq('id', id);
    if (error) throw error;
    return;
  }
  const { id: _drop, ...rest } = data;
  await updateDoc(doc(HIGHLIGHTS(), id), { ...rest });
}

export async function removeHighlight(id) {
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const { error } = await supabase.from('highlights').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  await deleteDoc(doc(HIGHLIGHTS(), id));
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
  if (USE_SUPABASE) {
    const { count, error } = await supabase.from('highlights').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return Number(count) || 0;
  }
  const snap = await getCountFromServer(query(HIGHLIGHTS()));
  return Number(snap.data().count) || 0;
}
