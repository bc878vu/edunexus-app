// src/db/reviews.js — file (resource) reviews adapter.
//
// Postgres: file_reviews, file_review_reports (plan §1 tables 6-7).
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).

import {
  collection, query, where, orderBy,
  supabase, USE_SUPABASE, db,
  nowIso, toRow, fromRow, invertSpec,
  cachedList, clearCachedPrefix,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const reviewCol = (fileId) =>
  collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'files', fileId, 'reviews');

const CACHE_PREFIX = 'file_reviews_';

const REVIEW_SPEC = {
  userId: 'user_id',
  rating: 'rating',
  comment: 'comment',
  originalComment: 'original_comment',
  status: 'status',
  createdAt: { col: 'created_at', ts: true },
  editedAt: { col: 'edited_at', ts: true },
  moderatedAt: { col: 'moderated_at', ts: true },
};
const REVIEW_REV = invertSpec(REVIEW_SPEC);
const toReviewRow = (data) => toRow(data, REVIEW_SPEC);
const toReview = (row) => fromRow(row, REVIEW_REV, (out, r) => { out.fileId = r.file_id; });

const REPORT_SPEC = {
  reporterUid: 'reporter_uid',
  reason: 'reason',
  createdAt: { col: 'created_at', ts: true },
};
const REPORT_REV = invertSpec(REPORT_SPEC);
const toReport = (row) => fromRow(row, REPORT_REV, (out, r) => {
  out.fileId = r.file_id; out.reviewId = r.review_id;
});

/** List reviews for a file. status: 'approved' (public) | 'pending' | 'rejected' | 'all'. */
export async function listReviews(fileId, { status = 'approved' } = {}) {
  const key = CACHE_PREFIX + fileId + '|' + status;
  return cachedList(key, async () => {
    let q = supabase.from('file_reviews').select('*').eq('file_id', fileId);
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toReview);
  });
}

/**
 * Submit a review. Doc id == user id (deterministic, overwrites own review).
 * Returns the review id (== userId).
 * NOTE (pre-existing Supabase-branch quirk, unchanged by Phase 2): the
 * upsert conflicts on `id` alone, and id == userId, so one user's review on
 * a second file overwrites their review on the first file. Firestore scoped
 * reviews per file (subcollection); the Supabase table needs a
 * (file_id, user_id) unique key before this is fully per-file.
 */
export async function addReview(fileId, { userId, rating, comment }) {
  if (!userId) throw new Error('userId is required');
  clearCachedPrefix(CACHE_PREFIX + fileId);
  const id = userId;
  const row = {
    id,
    file_id: fileId,
    user_id: userId,
    rating: Number(rating),
    comment: String(comment),
    original_comment: String(comment),
    status: 'approved',
    created_at: nowIso(),
  };
  const { error } = await supabase.from('file_reviews').upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return id;
}

export async function updateReview(fileId, reviewId, data) {
  clearCachedPrefix(CACHE_PREFIX + fileId);
  const row = toReviewRow(data);
  const { error } = await supabase.from('file_reviews').update(row).eq('id', reviewId);
  if (error) throw error;
}

export async function deleteReview(fileId, reviewId) {
  clearCachedPrefix(CACHE_PREFIX + fileId);
  const { error } = await supabase.from('file_reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

/** Private report on a review (one per reporter; doc id == reporter uid). */
export async function reportReview(fileId, reviewId, reporterUid, reason) {
  const { error } = await supabase.from('file_review_reports').upsert({
    file_id: fileId, review_id: reviewId, reporter_uid: reporterUid,
    reason, created_at: nowIso(),
  }, { onConflict: 'review_id,reporter_uid' });
  if (error) throw error;
}

/** Admin: inspect private reports on a review. */
export async function listReviewReports(fileId, reviewId) {
  const { data, error } = await supabase.from('file_review_reports').select('*')
    .eq('review_id', reviewId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toReport);
}

/** Admin: dismiss a report. */
export async function deleteReport(fileId, reviewId, reporterUid) {
  const { error } = await supabase.from('file_review_reports').delete()
    .eq('review_id', reviewId).eq('reporter_uid', reporterUid);
  if (error) throw error;
}

/**
 * Recompute ratingAverage/ratingCount from approved reviews and store on the file.
 * Supabase branch: client recompute for parity.
 * TODO: plan §3 adds a DB trigger that recomputes files.rating_* on
 * file_reviews writes — once live, this function becomes a no-op safety net.
 */
export async function refreshRatingSummary(fileId) {
  clearCachedPrefix('academic_files_');
  try {
    const reviews = await listReviews(fileId, { status: 'approved' });
    let sum = 0, total = 0;
    reviews.forEach((r) => {
      const rating = Number(r.rating);
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) { sum += rating; total++; }
    });
    const value = total > 0 ? sum / total : null;
    const { error } = await supabase.from('files').update({
      rating_average: value, rating_count: total, rating_summary_updated_at: nowIso(),
    }).eq('id', fileId);
    if (error) throw error;
    return true;
  } catch (_) {
    return false;
  }
}

export function subscribeReviews(fileId, { status = 'approved', onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX + fileId); try { onInvalidate(); } catch (_) {} };
  if (USE_SUPABASE) {
    return subscribeTable({
      table: 'file_reviews',
      filter: `file_id=eq.${fileId}`,
      tag: status, // 'approved' | 'all' | 'pending' — each purpose gets its own realtime channel
      onInvalidate: invalidate,
    });
  }
  const parts = [];
  if (status && status !== 'all') parts.push(where('status', '==', status));
  parts.push(orderBy('createdAt', 'desc'));
  return subscribeTable({
    table: 'file_reviews',
    onInvalidate: invalidate,
    firebaseQuery: query(reviewCol(fileId), ...parts),
  });
}
