// src/db/siteProfile.js — site/portfolio profile adapter.
//
// Firestore today:  artifacts/edunexus-live/public/data/profile/main
// Postgres target:  site_profile (plan §1 table 13), id='main', data JSONB.
//
// The profile document is schemaless (fullName, title, about, picUrl,
// contactEmail/Phone, projects, skills, experience, services, customSections,
// updatedAt). It maps 1:1 into the data JSONB column — no field mapping needed.

import {
  doc, getDoc, setDoc, serverTimestamp,
  supabase, USE_SUPABASE, db,
  nowIso,
  withFallback,
} from './_common.js';

const PROFILE = () => doc(db, 'artifacts', 'edunexus-live', 'public', 'data', 'profile', 'main');
const ROW_ID = 'main';

/** Read the site profile. Returns the data object, or null when absent. */
export async function getSiteProfile() {
  return withFallback(
    async () => {
      const { data, error } = await supabase.from('site_profile').select('data').eq('id', ROW_ID).maybeSingle();
      if (error) throw error;
      return data ? data.data : null;
    },
    async () => {
      const snap = await getDoc(PROFILE());
      return snap.exists() ? snap.data() : null;
    },
    { cacheKeys: [] }
  );
}

/**
 * Merge-save profile fields (same semantics as setDoc(..., { merge: true })).
 * `patch` is a plain object of fields; updatedAt is refreshed server-side.
 */
export async function saveSiteProfile(patch) {
  return withFallback(
    async () => {
      const current = (await getSiteProfile()) || {};
      const merged = { ...current, ...patch, updatedAt: nowIso() };
      const { error } = await supabase.from('site_profile')
        .upsert({ id: ROW_ID, data: merged }, { onConflict: 'id' });
      if (error) throw error;
      return merged;
    },
    async () => {
      await setDoc(PROFILE(), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      return patch;
    },
    { cacheKeys: [] }
  );
}
