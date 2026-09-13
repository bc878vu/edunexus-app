import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8",
  authDomain: "edunexus-live-e0b84.firebaseapp.com",
  projectId: "edunexus-live-e0b84",
  storageBucket: "edunexus-live-e0b84.firebasestorage.app",
  messagingSenderId: "464541062794",
  appId: "1:464541062794:web:7894ed257d604f202bbf73"
};

// App.js initializes the DEFAULT Firebase app; reuse it so this warm-up
// listener shares the same Firestore SDK cache with the dashboard.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const highlightsRef = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'highlights');
const warmupQuery = query(highlightsRef, orderBy('createdAt', 'desc'), limit(8));
const unsubscribe = onSnapshot(warmupQuery, () => {}, () => {});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', unsubscribe, { once: true });
}
