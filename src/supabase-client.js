// Supabase client — replaces src/firebase-client.js (Firebase Auth + Firestore).
// Migration Phase 1: added alongside firebase-client.js; components migrate
// to this via the src/db/ adapter behind the REACT_APP_DATA_BACKEND flag.
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://cprpndovdfnkvekewstv.supabase.co';
// Publishable (anon) key — public, safe to embed in client builds.
// From Supabase dashboard → Project Settings → API Keys (2026-09-28).
const SUPABASE_ANON_KEY = 'sb_publishable_mEibYO_BunfJGJm66fZHhw_hHxWL8TC';

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'PASTE_FULL_PUBLISHABLE_KEY_HERE') {
  // eslint-disable-next-line no-console
  console.warn('[supabase-client] anon key not set — Supabase reads/writes will fail until configured.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 5 } },
});

// Backend selector: 'firebase' (current) | 'supabase' (migration target).
// Set REACT_APP_DATA_BACKEND=supabase on the Vercel preview deployment.
export const DATA_BACKEND = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_DATA_BACKEND) || 'firebase';
export const USE_SUPABASE = DATA_BACKEND === 'supabase';

export default supabase;
