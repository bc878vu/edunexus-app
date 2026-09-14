import { getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const CACHE_KEY = 'edunexus_dashboard_fast_v4';
const LEGACY_CACHE_KEY = 'edunexus_dashboard_fast_v3';

function saveHighlights(rows) {
  if (typeof window === 'undefined' || !rows.length) return;
  try {
    const previous = JSON.parse(localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY) || '{}');
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...previous,
      highlights: rows,
      updatedAt: Date.now(),
    }));
  } catch {}
}

export function startHighlightsWarmup() {
  if (!getApps().length) return () => {};
  const db = getFirestore(getApp());
  const highlightsRef = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'highlights');
  const warmupQuery = query(highlightsRef, orderBy('createdAt', 'desc'), limit(8));
  const unsubscribe = onSnapshot(warmupQuery, (snap) => {
    saveHighlights(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => {});
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', unsubscribe, { once: true });
  return unsubscribe;
}
