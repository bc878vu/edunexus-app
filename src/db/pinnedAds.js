// src/db/pinnedAds.js — pinned ads adapter.
//
// Firestore today:  artifacts/edunexus-live/public/data/pinned_ads
// Postgres target:  pinned_ads (plan §1 table 9).

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCached, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const PINNED_ADS = () => collection(db, 'artifacts/edunexus-live/public/data/pinned_ads');
const CACHE_PREFIX = 'pinned_ads_';

const AD_SPEC = {
  title: 'title',
  description: 'description',
  mediaType: 'media_type',
  videoUrl: 'video_url',
  imageUrl: 'image_url',
  linkUrl: 'link_url',
  size: 'player_size',
  position: 'player_position',
  isActive: 'is_active',
  startAt: { col: 'start_at', ts: true },
  endAt: { col: 'end_at', ts: true },
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
  // TODO(schema): plan §1 has no columns for `thumbnailUrl` (used by the admin
  // form and the dashboard card) or the v2 fields `media_type`, `image_url`,
  // `player_size`, `player_position`. Extend pinned_ads before relying on them
  // in Supabase; until then writes carrying those fields fall back to Firebase.
  thumbnailUrl: null,
};
const AD_REV = invertSpec(AD_SPEC);
const toAdRow = (data) => toRow(data, AD_SPEC);
const toAd = (row) => fromRow(row, AD_REV);

export async function listPinnedAds({ limit: max = 50 } = {}) {
  const key = CACHE_PREFIX + 'all|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('pinned_ads').select('*')
          .order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toAd);
      },
      async () => {
        const snap = await getDocs(query(PINNED_ADS(), orderBy('createdAt', 'desc'), limit(max)));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['pinned_ads_'] }
    );});
}

export async function getPinnedAd(id) {
  const key = CACHE_PREFIX + 'one|' + id;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('pinned_ads').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return toAd(data);
      },
      async () => {
        const snap = await getDoc(doc(PINNED_ADS(), id));
        return snap.exists() ? fbItem(snap) : null;
      },
      { cacheKeys: ['pinned_ads_'] }
    );});
}

export async function createPinnedAd(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toAdRow(data) };
      if (row.is_active === undefined) row.is_active = true;
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('pinned_ads').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      const ref = await addDoc(PINNED_ADS(), { ...rest });
      return ref.id;
    },
    { cacheKeys: ['pinned_ads_'] }
  );
}

export async function updatePinnedAd(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  clearCached(CACHE_PREFIX + 'one|' + id);
  return withFallback(
    async () => {
      const row = toAdRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('pinned_ads').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(PINNED_ADS(), id), { ...rest });
    },
    { cacheKeys: ['pinned_ads_'] }
  );
}

export async function removePinnedAd(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('pinned_ads').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(PINNED_ADS(), id));
    },
    { cacheKeys: ['pinned_ads_'] }
  );
}

export async function setPinnedAdActive(id, active) {
  return updatePinnedAd(id, { isActive: !!active });
}

/**
 * The currently active ad for the dashboard (PinnedAd.js logic, verbatim):
 * isActive=true and now within [startAt, endAt] (either bound may be empty);
 * the most recently created qualifying ad wins. Returns the ad or null.
 */
export async function getActiveAd() {
  const ads = await listPinnedAds({ limit: 50 });
  const now = Date.now();
  const toMs = (v) => {
    if (!v) return null;
    if (typeof v === 'object' && typeof v.toMillis === 'function') return v.toMillis();
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : null;
  };
  const active = ads.find((item) => {
    if (item.isActive === false) return false;
    const start = toMs(item.startAt);
    if (start !== null && now < start) return false;
    const end = toMs(item.endAt);
    if (end !== null && now > end) return false;
    return true;
  });
  return active || null;
}

export function subscribePinnedAds({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'pinned_ads',
    onInvalidate: invalidate,
    firebaseQuery: query(PINNED_ADS(), orderBy('createdAt', 'desc')),
  });
}
