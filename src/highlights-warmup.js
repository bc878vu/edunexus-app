import { getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export function startHighlightsWarmup() {
  if (!getApps().length) return () => {};
  const db = getFirestore(getApp());
  const highlightsRef = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'highlights');
  const warmupQuery = query(highlightsRef, orderBy('createdAt', 'desc'), limit(8));
  const unsubscribe = onSnapshot(warmupQuery, () => {}, () => {});
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', unsubscribe, { once: true });
  return unsubscribe;
}
