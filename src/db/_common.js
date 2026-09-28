// src/db/_common.js — INTERNAL helpers for the src/db/ adapter layer.
// Not part of the public adapter API (index.js does not re-export this).
//
// Conventions used by every module:
// - Firebase branch: Firestore calls copied verbatim from today's components.
//   Payloads pass through untouched (serverTimestamp() sentinels keep working).
// - Supabase branch: camelCase Firestore fields -> snake_case Postgres columns
//   (per MIGRATION_PLAN.md §1). Timestamps are normalized to ISO strings in JS.
// - New Supabase rows get client-generated TEXT ids (crypto.randomUUID()) so
//   deep links and deterministic-id flows keep working after migration.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  getCountFromServer,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase-client.js';
import { supabase, USE_SUPABASE } from '../supabase-client.js';
import { getCached, setCached, clearCached, clearCachedPrefix, CACHE_TTL } from '../firestoreCache.js';

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, writeBatch, getCountFromServer,
  onSnapshot, serverTimestamp,
};
export { db, supabase, USE_SUPABASE };
export { getCached, setCached, clearCached, clearCachedPrefix, CACHE_TTL };

// Root Firestore path used by every collection today.
export const ROOT = ['artifacts', 'edunexus-live', 'public', 'data'];
export const col = (name) => collection(db, ...ROOT, name);

export const nowIso = () => new Date().toISOString();

export function newId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_) { /* fall through */ }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

/**
 * Convert any timestamp-ish value to an ISO string (Supabase branch).
 * - null/undefined -> null (or now when allowNull is false)
 * - Firestore Timestamp (has toDate) -> ISO
 * - Date / number -> ISO
 * - string -> passed through
 * - anything else (serverTimestamp() sentinel, FieldValue, ...) -> now
 */
export function tsToIso(value, allowNull = true) {
  if (value === null || value === undefined) return allowNull ? null : nowIso();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? nowIso() : d.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') {
    try { return value.toDate().toISOString(); } catch (_) { return nowIso(); }
  }
  return nowIso();
}

/** Read-side normalizer: ISO string stays, Date/Timestamp become ISO. */
export function normalizeTs(value) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return value;
  return tsToIso(value);
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Map a camelCase input object to a snake_case Postgres row.
 * - spec: { camelKey: 'snake_col' | { col: 'snake_col', ts: true } | null }
 *   null means "drop on the Supabase branch" (documented per module with TODO).
 * - keys not in spec are dropped (Supabase has no schemaless columns).
 * - timestamp-marked fields go through tsToIso(); plain values pass through.
 */
export function toRow(input, spec) {
  const row = {};
  if (!isPlainObject(input)) return row;
  for (const [key, value] of Object.entries(input)) {
    if (key === 'id') continue; // id is handled explicitly by callers
    const rule = spec[key];
    if (rule === undefined || rule === null) continue; // dropped / unknown
    const colName = typeof rule === 'string' ? rule : rule.col;
    row[colName] = rule && typeof rule === 'object' && rule.ts ? tsToIso(value) : value;
  }
  return row;
}

/** Invert a toRow spec for read-side mapping (snake_case -> camelCase). */
export function invertSpec(spec) {
  const out = {};
  for (const [key, rule] of Object.entries(spec)) {
    if (rule === null || rule === undefined) continue;
    const colName = typeof rule === 'string' ? rule : rule.col;
    out[colName] = { key, ts: typeof rule === 'object' && !!rule.ts };
  }
  return out;
}

/** Map a Postgres row back to the Firestore-shaped object components use. */
export function fromRow(row, reverseSpec, extras) {
  if (!row) return null;
  const out = { id: row.id };
  for (const [colName, value] of Object.entries(row)) {
    if (colName === 'id') continue;
    const rule = reverseSpec[colName];
    if (!rule) continue;
    out[rule.key] = rule.ts ? normalizeTs(value) : value;
  }
  if (typeof extras === 'function') extras(out, row);
  return out;
}

export const fbItem = (snap) => ({ id: snap.id, ...snap.data() });

/** Escape % _ \ for PostgREST ilike patterns. */
export function escapeIlike(s) {
  return String(s).replace(/[\\%_]/g, (m) => '\\' + m);
}

/** Read-through cache wrapper for list queries (same key conventions as before). */
export async function cachedList(key, fetcher, ttl = CACHE_TTL.CATALOG) {
  const hit = getCached(key);
  if (hit !== undefined && hit !== null) return hit;
  const data = await fetcher();
  setCached(key, data, ttl);
  return data;
}
