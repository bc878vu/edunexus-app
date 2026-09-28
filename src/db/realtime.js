// src/db/realtime.js — INTERNAL realtime helper for the src/db/ adapter layer.
// Not re-exported from index.js; modules use it to build their subscribeX().
//
// Contract (MIGRATION_PLAN.md §7): components only get the onInvalidate pattern.
// Initial data always comes from the adapter read (+ firestoreCache); realtime
// only invalidates, never carries payloads.

import { onSnapshot } from 'firebase/firestore';
import { supabase, USE_SUPABASE } from './_common.js';

/**
 * Subscribe to table changes.
 * - table: Postgres table name (also used for the channel name).
 * - filter: optional PostgREST filter string for postgres_changes,
 *   e.g. 'subject=eq.CS101'. Ignored on the Firebase branch.
 * - onInvalidate: called (no payload) whenever anything changes.
 * - firebaseQuery: the Firestore Query to onSnapshot on the Firebase branch.
 * Returns an unsubscribe function.
 */
export function subscribeTable({ table, filter, onInvalidate, firebaseQuery }) {
  const fire = () => { try { onInvalidate(); } catch (_) {} };
  if (USE_SUPABASE) {
    const suffix = filter ? '-' + String(filter).replace(/[^A-Za-z0-9_=-]/g, '').slice(0, 60) : '';
    const channel = supabase
      .channel(`db-${table}${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        fire
      )
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }
  return onSnapshot(firebaseQuery, fire, () => {});
}

/**
 * Subscribe to a single document/row by id.
 * - firebaseDocRef: Firestore DocumentReference for the Firebase branch.
 */
export function subscribeRow({ table, id, onInvalidate, firebaseDocRef }) {
  const fire = () => { try { onInvalidate(); } catch (_) {} };
  if (USE_SUPABASE) {
    const channel = supabase
      .channel(`db-${table}-id-${String(id).slice(0, 40)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `id=eq.${id}` },
        fire
      )
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }
  return onSnapshot(firebaseDocRef, fire, () => {});
}
