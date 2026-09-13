import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8',
  authDomain: 'edunexus-live-e0b84.firebaseapp.com',
  projectId: 'edunexus-live-e0b84',
  storageBucket: 'edunexus-live-e0b84.firebasestorage.app',
  messagingSenderId: '464541062794',
  appId: '1:464541062794:web:7894ed257d604f202bbf73'
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auto-detect networks that interfere with Firestore WebChannel streaming and
// fall back to long-polling when needed. This is especially helpful on mobile,
// proxy and restricted networks and does not expose any credentials.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});

export const storage = getStorage(app);
export default app;
