// src/db/index.js — public entry point of the EduNexus data-access adapter.
//
// Every component talks to Firestore/Supabase through these modules only.
// Backend selection: REACT_APP_DATA_BACKEND=supabase | firebase (default).
// See MIGRATION_PLAN.md §7 for the adapter + onInvalidate realtime pattern.

export { DATA_BACKEND, USE_SUPABASE } from '../supabase-client.js';

export * from './auth.js';
export * from './files.js';
export * from './examMcqs.js';
export * from './articles.js';
export * from './reviews.js';
export * from './discussions.js';
export * from './highlights.js';
export * from './announcements.js';
export * from './tutorials.js';
export * from './pinnedAds.js';
export * from './feedback.js';
export * from './examReviews.js';
export * from './examProgress.js';
export * from './userProfiles.js';
export * from './siteProfile.js';
// realtime.js is internal (subscribe helpers used by the modules above).
// _common.js is internal (shared Firestore/Supabase plumbing).
