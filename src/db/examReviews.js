// src/db/examReviews.js — exam paper reviews adapter.
//
// Postgres: exam_community_reviews, exam_reviews,
//   exam_review_submissions, feedback (plan §1 tables 17-19, 12).
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).

import {
  collection, query, where, limit,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec,
  cachedList, clearCachedPrefix,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const colFor = (name) => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', name);
const COMMUNITY = () => colFor('examCommunityReviews');
const SUBMISSIONS = () => colFor('examReviewSubmissions');

const CACHE_PREFIX = 'exam_reviews_';

const COMMUNITY_SPEC = {
  userId: 'user_id',
  subject: 'subject',
  term: 'term',
  semester: 'semester',
  examDate: { col: 'exam_date' },       // DATE 'YYYY-MM-DD' string
  examTime: 'exam_time',
  examAt: { col: 'exam_at', ts: true },
  sharedBy: 'shared_by',
  difficulty: 'difficulty',
  topics: 'topics',
  summary: 'summary',
  paperName: 'paper_name',
  paperPath: 'paper_path',
  paperUrl: 'paper_url',
  isActive: 'is_active',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
};
const COMMUNITY_REV = invertSpec(COMMUNITY_SPEC);
const toCommunityRow = (data) => toRow(data, COMMUNITY_SPEC);
const toCommunity = (row) => fromRow(row, COMMUNITY_REV);

const SUBMISSION_SPEC = {
  userId: 'user_id',
  subject: 'subject',
  term: 'term',
  examDate: { col: 'exam_date' },
  difficulty: 'difficulty',
  topics: 'topics',
  summary: 'summary',
  status: 'status',
  createdAt: { col: 'created_at', ts: true },
  // Dropped on the Supabase branch (pre-existing): plan §1 has no
  // `moderated_at` column on exam_review_submissions. No component reads it back.
  moderatedAt: null,
};
const SUBMISSION_REV = invertSpec(SUBMISSION_SPEC);
const toSubmission = (row) => fromRow(row, SUBMISSION_REV);

const LEGACY_SPEC = {
  userId: 'user_id',
  subject: 'subject',
  term: 'term',
  semester: 'semester',
  examDate: { col: 'exam_date' },
  examTime: 'exam_time',
  sharedBy: 'shared_by',
  difficulty: 'difficulty',
  topics: 'topics',
  summary: 'summary',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
};
const LEGACY_REV = invertSpec(LEGACY_SPEC);
const toLegacyRow = (data) => toRow(data, LEGACY_SPEC);
const toLegacy = (row) => fromRow(row, LEGACY_REV);

/** Deterministic community-review id: {uid}_{subject}_{term}_{examDate}. */
export function communityReviewId(userId, subject, term, examDate) {
  return [userId, subject, term, examDate].join('_');
}

/**
 * Publish a student community review (ExamPaperCommunity.publish, verbatim).
 * Throws when the deterministic id already exists (duplicate guard).
 * Returns the id.
 */
export async function submitCommunityReview(data) {
  // Use a unique ID per submission (timestamp suffix) so multiple reviews
  // for the same course/term/date are allowed (no duplicate blocking).
  const baseId = data.id || communityReviewId(data.userId, data.subject, data.term, data.examDate);
  const id = baseId + '_' + Date.now().toString(36);
  if (!data.userId || !data.subject || !data.term || !data.examDate) {
    throw new Error('userId, subject, term and examDate are required');
  }
  clearCachedPrefix(CACHE_PREFIX);
  const row = { id, ...toCommunityRow(data) };
  if (!row.created_at) row.created_at = nowIso();
  // Listing filters is_active=true; ensure new reviews are visible.
  // (toCommunityRow only maps isActive if the caller passed it.)
  if (row.is_active == null) row.is_active = true;
  const { error } = await supabase.from('exam_community_reviews').insert(row);
  if (error) throw error;
  return id;
}

/** Public listing (ExamPaperCommunity).
 *  order: 'exam_date' (default, kept for admin/bot callers) or 'created_at'
 *  (newest submissions first — used by the public feed so newly published
 *  reviews surface immediately instead of being buried under the limit). */
export async function listCommunityReviews({ subject, term, activeOnly = true, limit: max = 200, order = 'exam_date' } = {}) {
  const key = CACHE_PREFIX + 'community|' + (subject || '-') + '|' + (term || '-') + '|' + max + '|' + order;
  return cachedList(key, async () => {
    let q = supabase.from('exam_community_reviews').select('*');
    if (subject) q = q.eq('subject', subject);
    if (term) q = q.eq('term', term);
    if (activeOnly) q = q.eq('is_active', true);
    const orderCol = order === 'created_at' ? 'created_at' : 'exam_date';
    const { data, error } = await q.order(orderCol, { ascending: false }).limit(max);
    if (error) throw error;
    return (data || []).map(toCommunity);
  });
}

/** Live totals for the public feed badge. The feed only loads a capped
 *  window (200 newest), so the badge must come from a count query, not
 *  from the loaded list length — otherwise the page keeps showing a stale
 *  number (e.g. 201) while the database holds 1,300+ reviews. Not cached:
 *  a count query is cheap and must reflect new submissions immediately. */
export async function countCommunityReviews({ activeOnly = true } = {}) {
  let q = supabase.from('exam_community_reviews').select('id', { count: 'exact', head: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function countLegacyReviews() {
  const { count, error } = await supabase.from('exam_reviews').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getCommunityReview(id) {
  const { data, error } = await supabase.from('exam_community_reviews').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toCommunity(data);
}

/** Admin: edit a community review (ExamPaperReviewManager save, verbatim fields). */
export async function updateCommunityReview(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  const row = toCommunityRow(data);
  row.updated_at = nowIso();
  const { error } = await supabase.from('exam_community_reviews').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteCommunityReview(id) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('exam_community_reviews').delete().eq('id', id);
  if (error) throw error;
}

/** Admin: hide/show a community review. */
export async function setCommunityReviewActive(id, active) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('exam_community_reviews')
    .update({ is_active: !!active, updated_at: nowIso() }).eq('id', id);
  if (error) throw error;
}

// ---- legacy moderation queue (ExamPrepHub AdminTools) ----

/** Admin: latest submissions (legacy queue), newest first. */
export async function listSubmissions({ limit: max = 100 } = {}) {
  const key = CACHE_PREFIX + 'submissions|' + max;
  return cachedList(key, async () => {
    const { data, error } = await supabase.from('exam_review_submissions').select('*')
      .order('created_at', { ascending: false }).limit(max);
    if (error) throw error;
    return (data || []).map(toSubmission);
  });
}

/**
 * Approve a submission: publish to exam_reviews + mark submission approved.
 * Supabase branch: two writes.
 * TODO(atomicity): wrap in a SECURITY DEFINER rpc (plan §7) so a crash between
 * the two writes cannot publish without marking (or vice versa).
 */
export async function approveSubmission(id) {
  clearCachedPrefix(CACHE_PREFIX);
  const submission = await getSubmission(id);
  if (!submission) throw new Error('Submission not found: ' + id);
  const published = {
    subject: submission.subject,
    term: submission.term,
    examDate: submission.examDate,
    difficulty: submission.difficulty,
    topics: String(submission.topics || '').slice(0, 400),
    summary: String(submission.summary || '').slice(0, 1500),
  };
  const { error: insError } = await supabase.from('exam_reviews').insert({
    id, ...toLegacyRow({ ...published, createdAt: nowIso() }),
  });
  if (insError) throw insError;
  const { error: updError } = await supabase.from('exam_review_submissions')
    .update({ status: 'approved' }).eq('id', id);
  if (updError) throw updError;
}

export async function rejectSubmission(id) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('exam_review_submissions')
    .update({ status: 'rejected' }).eq('id', id);
  if (error) throw error;
}

async function getSubmission(id) {
  const { data, error } = await supabase.from('exam_review_submissions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toSubmission(data);
}

/** Legacy admin-curated reviews (ExamPaperReviewManager second collection). */
export async function listLegacyReviews({ subject, term, limit: max = 200 } = {}) {
  const key = CACHE_PREFIX + 'legacy|' + (subject || '-') + '|' + (term || '-') + '|' + max;
  return cachedList(key, async () => {
    let q = supabase.from('exam_reviews').select('*');
    if (subject) q = q.eq('subject', subject);
    if (term) q = q.eq('term', term);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
    if (error) throw error;
    return (data || []).map(toLegacy);
  });
}

export async function updateLegacyReview(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  const row = toLegacyRow(data);
  row.updated_at = nowIso();
  const { error } = await supabase.from('exam_reviews').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteLegacyReview(id) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('exam_reviews').delete().eq('id', id);
  if (error) throw error;
}

// ---- feedback reports on public reviews (ExamPaperCommunity report button) ----

/** File a private report about a public exam review. Returns the id. */
export async function submitFeedbackReport({ userId, reviewId, reviewCollection, reason }) {
  clearCachedPrefix('feedback_');
  const id = newId();
  const { error } = await supabase.from('feedback').insert({
    id,
    user_id: userId,
    category: 'exam-review-report',
    review_id: reviewId,
    review_collection: reviewCollection,
    reason,
    created_at: nowIso(),
  });
  if (error) throw error;
  return id;
}

// ---- realtime (onInvalidate only, per plan §7) ----

export function subscribeCommunityReviews({ subject, term, onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  if (USE_SUPABASE) {
    const filters = [];
    if (subject) filters.push(`subject=eq.${subject}`);
    if (term) filters.push(`term=eq.${term}`);
    return subscribeTable({
      table: 'exam_community_reviews',
      filter: filters.length ? filters.join(',') : undefined,
      onInvalidate: invalidate,
    });
  }
  const parts = [];
  if (subject) parts.push(where('subject', '==', subject));
  if (term) parts.push(where('term', '==', term));
  return subscribeTable({
    table: 'exam_community_reviews',
    onInvalidate: invalidate,
    firebaseQuery: query(COMMUNITY(), ...parts),
  });
}

export function subscribeSubmissions({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'exam_review_submissions',
    onInvalidate: invalidate,
    firebaseQuery: query(SUBMISSIONS(), limit(100)),
  });
}
