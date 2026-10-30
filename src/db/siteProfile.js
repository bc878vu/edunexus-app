// src/db/siteProfile.js — site/portfolio profile adapter.
//
// Postgres: site_profile (plan §1 table 13), id='main', data JSONB.
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).
//
// The profile document is schemaless (fullName, title, about, picUrl,
// contactEmail/Phone, projects, skills, experience, services, customSections,
// updatedAt). It maps 1:1 into the data JSONB column — no field mapping needed.

import { supabase, nowIso } from './_common.js';

const ROW_ID = 'main';

/** Read the site profile. Returns the data object, or null when absent. */
export async function getSiteProfile() {
  const { data, error } = await supabase.from('site_profile').select('data').eq('id', ROW_ID).maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

/**
 * Merge-save profile fields (same semantics as setDoc(..., { merge: true })).
 * `patch` is a plain object of fields; updatedAt is refreshed server-side.
 * Returns the merged profile (the Supabase branch's return value).
 */
export async function saveSiteProfile(patch) {
  const current = (await getSiteProfile()) || {};
  const merged = { ...current, ...patch, updatedAt: nowIso() };
  const { error } = await supabase.from('site_profile')
    .upsert({ id: ROW_ID, data: merged }, { onConflict: 'id' });
  if (error) throw error;
  return merged;
}
