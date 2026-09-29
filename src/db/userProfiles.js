// src/db/userProfiles.js — user profile adapter (AI assistant context).
//
// Firestore today:  users/{uid}/profile/main   (merge-written by
//   ProfessionalAIAssistantV2: { displayName, email, updatedAt })
// Postgres target:  user_profiles (plan §1 table 15).

import {
  doc, getDoc, setDoc, serverTimestamp,
  supabase, USE_SUPABASE, db,
  nowIso,
  withFallback,
} from './_common.js';

const profileDoc = (uid) => doc(db, 'artifacts', 'edunexus-live', 'users', uid, 'profile', 'main');

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
  return withFallback(
    async () => {
      const { data, error } = await supabase.from('user_profiles').select('*')
        .eq('user_id', uid).maybeSingle();
      if (error) throw error;
      return toProfile(uid, data);
    },
    async () => {
      const snap = await getDoc(profileDoc(uid));
      return snap.exists() ? toProfile(uid, snap.data()) : null;
    },
    { cacheKeys: [] }
  );
}

/** Merge-write profile fields (upsert). */
export async function saveUserProfile(uid, data) {
  if (!uid) throw new Error('uid is required');
  return withFallback(
    async () => {
      const row = { user_id: uid, updated_at: nowIso() };
      if (data.displayName !== undefined || data.display_name !== undefined) {
        row.display_name = data.displayName ?? data.display_name ?? null;
      }
      if (data.email !== undefined) row.email = data.email || null;
      const { error } = await supabase.from('user_profiles').upsert(row, { onConflict: 'user_id' });
      if (error) throw error;
      return;
    },
    async () => {
      await setDoc(profileDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    },
    { cacheKeys: [] }
  );
}
