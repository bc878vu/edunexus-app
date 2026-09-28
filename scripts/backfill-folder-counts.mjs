// One-time backfill: compute true per-folder file counts and store in meta/folders.fileCounts
// Run: node scripts/backfill-folder-counts.mjs
import { initializeApp } from 'firebase/app';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBX0A2m9YQ0J8Q0J8Q0J8Q0J8Q0J8Q0J8Q0', // placeholder - replaced below
  authDomain: 'edunexus-live-e0b84.firebaseapp.com',
  projectId: 'edunexus-live-e0b84',
};

// Read the real config from src/firebase-client.js
import { readFileSync } from 'fs';
const clientSrc = readFileSync(new URL('../src/firebase-client.js', import.meta.url), 'utf8');
const apiKeyMatch = clientSrc.match(/apiKey:\s*'([^']+)'/);
if (!apiKeyMatch) { console.error('Could not find apiKey in firebase-client.js'); process.exit(1); }
firebaseConfig.apiKey = apiKeyMatch[1];

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, useFetchStreams: false });

const BASE = ['artifacts', 'edunexus-live', 'public', 'data'];
const FILES = collection(db, ...BASE, 'files');
const FOLDERS = doc(db, ...BASE, 'meta', 'folders');

const cut = (s, n) => String(s || '').slice(0, n);

async function main() {
  console.log('Fetching all files...');
  const snap = await getDocs(FILES);
  console.log(`Found ${snap.size} files`);
  
  const counts = {};
  snap.docs.forEach((d) => {
    const subject = cut(d.data().subject, 50);
    if (subject) counts[subject] = (counts[subject] || 0) + 1;
  });
  
  console.log(`\nPer-folder counts (${Object.keys(counts).length} folders with files):`);
  Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  
  console.log('\nWriting fileCounts to meta/folders...');
  await updateDoc(FOLDERS, { fileCounts: counts });
  console.log('Done! fileCounts updated.');
}

main().catch((e) => { console.error('Backfill failed:', e.message); process.exit(1); });
