// src/db/auth.js — auth adapter (Firebase Auth <-> Supabase Auth).
//
// Firebase branch: signInAnonymously / signInWithEmailAndPassword /
//   onAuthStateChanged / user.getIdToken(true), verbatim.
// Supabase branch: supabase.auth.signInAnonymously() / signInWithPassword() /
//   onAuthStateChange / session.access_token.

import {
  signInAnonymously as fbSignInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../firebase-client.js';
import { supabase, USE_SUPABASE } from '../supabase-client.js';
import { withFallback } from './_common.js';

/**
 * Normalize a Firebase user or Supabase user to the shape components use.
 * Extra provider fields stay on `raw`.
 */
export function toAppUser(user) {
  if (!user) return null;
  // Detect backend by user object shape (not build-time flag) so Firebase
  // fallback results normalize correctly even when USE_SUPABASE is true.
  const isSupabaseShape = user.id !== undefined && user.uid === undefined;
  if (isSupabaseShape) {
    const meta = user.user_metadata || {};
    return {
      uid: user.id,
      email: user.email || '',
      displayName: meta.display_name || meta.name || meta.full_name || '',
      photoURL: meta.avatar_url || meta.picture || '',
      emailVerified: !!user.email_confirmed_at,
      isAnonymous: !!user.is_anonymous,
      raw: user,
    };
  }
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    emailVerified: user.emailVerified === true,
    isAnonymous: user.isAnonymous === true,
    raw: user,
  };
}

/** Ensure a signed-in user; anonymous guests are signed in on demand. */
export async function ensureAnon() {
  const current = await getCurrentUser();
  if (current) return current;
  return withFallback(
    async () => {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return toAppUser(data.user);
    },
    async () => {
      const cred = await fbSignInAnonymously(auth);
      return toAppUser(cred.user);
    },
    { cacheKeys: [] }
  );
}

/** Firebase admin sign-in (shared). Firestore's admin() rule requires a
 *  Firebase ID token with the verified admin email — without it every admin
 *  Firestore write (pinned ads, articles, catalog edits...) is denied. */
async function firebaseAdminSignIn(email, password) {
  // Tab-scoped session: admin auth survives refresh in this tab but is not
  // automatically shared with every other tab through Firebase's default
  // LOCAL persistence.
  await setPersistence(auth, browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await credential.user.reload();
  if (!credential.user.emailVerified) {
    // Verification is optional now: Firestore admin rules check the email
    // address itself, so an unverified admin session still has full admin
    // access. We still attempt to send the verification email as a courtesy,
    // but login is never blocked on it.
    try { await sendEmailVerification(credential.user); } catch { /* courtesy only */ }
  }
  return credential;
}

/** Admin email/password sign-in. Components keep their own gating/verification. */
export async function signInAdmin(email, password) {  return withFallback(
    async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Dual sign-in: a Supabase-only session leaves request.auth empty in
      // Firestore, so admin() fails and all admin Firestore writes are denied.
      // Sign into Firebase too so the admin panel CRUD (pinned ads, articles,
      // announcements, catalog edits) keeps working.
      try {
        await firebaseAdminSignIn(email, password);
      } catch (fbErr) {
        throw new Error(
          'Supabase login succeeded, but Firebase admin sign-in failed (' +
          ((fbErr && fbErr.message) || fbErr) +
          '). Firestore admin features (pinned ads, content editing) need the Firebase password for ' +
          email + ' to match.'
        );
      }
      return toAppUser(data.user);
    },
    async () => {
      const credential = await firebaseAdminSignIn(email, password);
      return toAppUser(credential.user);
    },
    { cacheKeys: [] }
  );
}

/** Sign in with Google (OAuth). Returns the normalized app user.
 *  Supabase-primary: uses supabase.auth.signInWithOAuth (redirects to Google).
 *  Firebase fallback: signInWithPopup with GoogleAuthProvider.
 *  Google provides photoURL (profile picture) automatically. */
export async function signInWithGoogle() {
  return withFallback(
    async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // OAuth redirects away; user object resolves on return via getSession.
      // Return null here — the auth state listener picks up the session.
      return null;
    },
    async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      return toAppUser(credential.user);
    },
    { cacheKeys: [] }
  );
}

export async function signOut() {  return withFallback(
    async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return;
    },
    async () => {
      await fbSignOut(auth);
    },
    { cacheKeys: [] }
  );
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
  return withFallback(
    async () => {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    },
    async () => {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken(true);
    },
    { cacheKeys: [] }
  );
}

export async function getCurrentUser() {
  return withFallback(
    async () => {
      const { data } = await supabase.auth.getSession();
      return toAppUser(data?.session?.user ?? null);
    },
    async () => {
      return toAppUser(auth.currentUser);
    },
    { cacheKeys: [] }
  );
}
