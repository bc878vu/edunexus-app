// src/db/userProfiles.js — user profile adapter (AI assistant context).
//
// Postgres: user_profiles (plan §1 table 15).
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).

import { supabase, nowIso } from './_common.js';

function toProfile(uid, data) {
  if (!data) return null;
  return {
    uid,
    displayName: data.displayName || data.display_name || data.name || data.fullName || '',
    email: data.email || '',
    updatedAt: data.updatedAt || data.updated_at || null,
  };
}

/** Read a user's profile. Returns null when none exists. */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const { data, error } = await supabase.from('user_profiles').select('*')
    .eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return toProfile(uid, data);
}

/** Merge-write profile fields (upsert). */
export async function saveUserProfile(uid, data) {
  if (!uid) throw new Error('uid is required');
  const row = { user_id: uid, updated_at: nowIso() };
  if (data.displayName !== undefined || data.display_name !== undefined) {
    row.display_name = data.displayName ?? data.display_name ?? null;
  }
  if (data.email !== undefined) row.email = data.email || null;
  const { error } = await supabase.from('user_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}
