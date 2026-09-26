/**
 * firestoreCache.js — Shared in-memory + sessionStorage cache for Firestore reads.
 *
 * Purpose: cut Firestore read quota usage AND make repeat page visits instant.
 * - In-memory Map: fastest, per page-load (survives component remounts).
 * - sessionStorage: survives page reloads within the same tab (5-min default TTL).
 *
 * Usage:
 *   import { getCached, setCached, clearCached, CACHE_TTL } from './firestoreCache';
 *
 *   const cached = getCached('academic_files_CS101');
 *   if (cached) { setFiles(cached); return; } // zero reads, instant render
 *   const snap = await getDocs(q);
 *   const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
 *   setCached('academic_files_CS101', data);
 *   setFiles(data);
 *
 * Rules:
 * - Cache keys must include every query parameter (subject, term, userId, etc.).
 * - Do NOT cache admin write-paths or per-user private data longer than 2 minutes.
 * - Call clearCached(key) after a successful write that changes the cached query.
 */

const memoryCache = new Map();

export const CACHE_TTL = {
  STATIC: 10 * 60 * 1000,  // announcements, articles, highlights — rarely change
  CATALOG: 5 * 60 * 1000,  // exam catalog, file lists — change occasionally
  DYNAMIC: 2 * 60 * 1000,  // reviews, discussions — change more often
};

function sessionGet(key) {
  try {
    const raw = window.sessionStorage.getItem('fsc_' + key);
    if (!raw) return null;
    const { data, fetchedAt, ttl } = JSON.parse(raw);
    if (Date.now() - fetchedAt > ttl) {
      window.sessionStorage.removeItem('fsc_' + key);
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

function sessionSet(key, data, ttl) {
  try {
    window.sessionStorage.setItem('fsc_' + key, JSON.stringify({ data, fetchedAt: Date.now(), ttl }));
  } catch (_) {
    // sessionStorage full or unavailable — memory cache still works
  }
}

/**
 * Get cached data if fresh. Checks memory first, then sessionStorage.
 * @returns {any|null} cached data or null
 */
export function getCached(key) {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.fetchedAt < mem.ttl) return mem.data;
  if (mem) memoryCache.delete(key);
  return sessionGet(key);
}

/**
 * Store data in both memory and sessionStorage.
 */
export function setCached(key, data, ttl = CACHE_TTL.CATALOG) {
  memoryCache.set(key, { data, fetchedAt: Date.now(), ttl });
  sessionSet(key, data, ttl);
}

/**
 * Invalidate a cache key (call after writes).
 */
export function clearCached(key) {
  memoryCache.delete(key);
  try { window.sessionStorage.removeItem('fsc_' + key); } catch (_) {}
}

/**
 * Invalidate all keys starting with a prefix (e.g. after bulk import).
 */
export function clearCachedPrefix(prefix) {
  for (const k of [...memoryCache.keys()]) {
    if (k.startsWith(prefix)) memoryCache.delete(k);
  }
  try {
    const toRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('fsc_' + prefix)) toRemove.push(k);
    }
    toRemove.forEach(k => window.sessionStorage.removeItem(k));
  } catch (_) {}
}
