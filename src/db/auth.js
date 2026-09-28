// src/db/auth.js — auth adapter (Firebase Auth <-> Supabase Auth).
//
// Firebase branch: signInAnonymously / signInWithEmailAndPassword /
//   onAuthStateChanged / user.getIdToken(true), verbatim.
// Supabase branch: supabase.auth.signInAnonymously() / signInWithPassword() /
//   onAuthStateChange / session.access_token.

import {
  signInAnonymously as fbSignInAnonymously,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../firebase-client.js';
import { supabase, USE_SUPABASE } from '../supabase-client.js';

/**
 * Normalize a Firebase user or Supabase user to the shape components use.
 * Extra provider fields stay on `raw`.
 */
export function toAppUser(user) {
  if (!user) return null;
  if (USE_SUPABASE) {
    const meta = user.user_metadata || {};
    return {
      uid: user.id,
      email: user.email || '',
      displayName: meta.display_name || meta.name || meta.full_name || '',
      emailVerified: !!user.email_confirmed_at,
      isAnonymous: !!user.is_anonymous,
      raw: user,
    };
  }
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    emailVerified: user.emailVerified === true,
    isAnonymous: user.isAnonymous === true,
    raw: user,
  };
}

/** Ensure a signed-in user; anonymous guests are signed in on demand. */
export async function ensureAnon() {
  const current = await getCurrentUser();
  if (current) return current;
  if (USE_SUPABASE) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return toAppUser(data.user);
  }
  const cred = await fbSignInAnonymously(auth);
  return toAppUser(cred.user);
}

/** Admin email/password sign-in. Components keep their own gating/verification. */
export async function signInAdmin(email, password) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return toAppUser(data.user);
  }
  // Tab-scoped session: admin auth survives refresh in this tab but is not
  // automatically shared with every other tab through Firebase's default
  // LOCAL persistence.
  await setPersistence(auth, browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await credential.user.reload();
  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user);
    await fbSignOut(auth);
    await fbSignInAnonymously(auth);
    throw new Error('Verification email sent to the admin address. Open it, verify your email, then sign in again.');
  }
  return toAppUser(credential.user);
}

export async function signOut() {
  if (USE_SUPABASE) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }
  await fbSignOut(auth);
}

/**
 * Auth-state listener. cb receives the normalized user (or null).
 * Returns an unsubscribe function.
 */
export function onAuthChange(cb) {
  const fire = (user) => { try { cb(toAppUser(user)); } catch (_) {} };
  if (USE_SUPABASE) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      fire(session?.user ?? null);
    });
    return () => { try { data.subscription.unsubscribe(); } catch (_) {} };
  }
  return onAuthStateChanged(auth, fire);
}

/**
 * Token sent to the edunexus-sign-upload edge function.
 * Firebase branch: user.getIdToken(true). Supabase branch: session.access_token.
 */
export async function getAccessToken() {
  if (USE_SUPABASE) {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}

export async function getCurrentUser() {
  if (USE_SUPABASE) {
    const { data } = await supabase.auth.getSession();
    return toAppUser(data?.session?.user ?? null);
  }
  return toAppUser(auth.currentUser);
}
