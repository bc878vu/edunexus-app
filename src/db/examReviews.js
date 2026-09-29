// src/db/examReviews.js — exam paper reviews adapter.
//
// Firestore today:
//   examCommunityReviews/{uid}_{subject}_{term}_{examDate}  (deterministic id,
//     written directly by ExamPaperCommunity.publish)
//   examReviews/{id}              (legacy admin-curated; ExamPaperReviewManager)
//   examReviewSubmissions/{id}    (legacy moderation queue; ExamPrepHub)
//   feedback                      (category 'exam-review-report' reports)
// Postgres target: exam_community_reviews, exam_reviews,
//   exam_review_submissions, feedback (plan §1 tables 17-19, 12).

import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, limit, writeBatch, serverTimestamp,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const colFor = (name) => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', name);
const COMMUNITY = () => colFor('examCommunityReviews');
const LEGACY = () => colFor('examReviews');
const SUBMISSIONS = () => colFor('examReviewSubmissions');
const FEEDBACK = () => colFor('feedback');

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
  // TODO(schema): plan §1 has no `moderated_at` column on exam_review_submissions.
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
  const id = data.id || communityReviewId(data.userId, data.subject, data.term, data.examDate);
  if (!data.userId || !data.subject || !data.term || !data.examDate) {
    throw new Error('userId, subject, term and examDate are required');
  }
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { data: existing, error: readError } = await supabase.from('exam_community_reviews')
        .select('id').eq('id', id).maybeSingle();
      if (readError) throw readError;
      if (existing) throw new Error('duplicate: a review already exists for this course, exam type and date');
      const row = { id, ...toCommunityRow(data) };
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('exam_community_reviews').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const ref = doc(COMMUNITY(), id);
      const snap = await getDoc(ref);
      if (snap.exists()) throw new Error('duplicate: a review already exists for this course, exam type and date');
      const { id: _drop, ...rest } = data;
      await setDoc(ref, { ...rest });
      return id;
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

/** Public listing (ExamPaperCommunity). */
export async function listCommunityReviews({ subject, term, activeOnly = true, limit: max = 200 } = {}) {
  const key = CACHE_PREFIX + 'community|' + (subject || '-') + '|' + (term || '-') + '|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        let q = supabase.from('exam_community_reviews').select('*');
        if (subject) q = q.eq('subject', subject);
        if (term) q = q.eq('term', term);
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q.order('exam_date', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toCommunity);
      },
      async () => {
        const parts = [];
        if (subject) parts.push(where('subject', '==', subject));
        if (term) parts.push(where('term', '==', term));
        parts.push(limit(max));
        const snap = await getDocs(query(COMMUNITY(), ...parts));
        let items = snap.docs.map(fbItem);
        if (activeOnly) items = items.filter((r) => r.isActive !== false);
        return items;
      },
      { cacheKeys: ['exam_reviews_'] }
    );});
}

export async function getCommunityReview(id) {
  return withFallback(
    async () => {
      const { data, error } = await supabase.from('exam_community_reviews').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return toCommunity(data);
    },
    async () => {
      const snap = await getDoc(doc(COMMUNITY(), id));
      return snap.exists() ? fbItem(snap) : null;
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

/** Admin: edit a community review (ExamPaperReviewManager save, verbatim fields). */
export async function updateCommunityReview(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const row = toCommunityRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('exam_community_reviews').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(COMMUNITY(), id), { ...rest });
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

export async function deleteCommunityReview(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('exam_community_reviews').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(COMMUNITY(), id));
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

/** Admin: hide/show a community review. */
export async function setCommunityReviewActive(id, active) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('exam_community_reviews')
        .update({ is_active: !!active, updated_at: nowIso() }).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await updateDoc(doc(COMMUNITY(), id), { isActive: !!active, updatedAt: serverTimestamp() });
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

// ---- legacy moderation queue (ExamPrepHub AdminTools) ----

/** Admin: latest submissions (legacy queue), newest first. */
export async function listSubmissions({ limit: max = 100 } = {}) {
  const key = CACHE_PREFIX + 'submissions|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('exam_review_submissions').select('*')
          .order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toSubmission);
      },
      async () => {
        const snap = await getDocs(query(SUBMISSIONS(), limit(max)));
        return snap.docs.map(fbItem)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      },
      { cacheKeys: ['exam_reviews_'] }
    );});
}

/**
 * Approve a submission: publish to exam_reviews + mark submission approved.
 * Firebase branch: writeBatch (verbatim from ExamPrepHub.moderate).
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
  return withFallback(
    async () => {
      const { error: insError } = await supabase.from('exam_reviews').insert({
        id, ...toLegacyRow({ ...published, createdAt: nowIso() }),
      });
      if (insError) throw insError;
      const { error: updError } = await supabase.from('exam_review_submissions')
        .update({ status: 'approved' }).eq('id', id);
      if (updError) throw updError;
      return;
    },
    async () => {
      const batch = writeBatch(db);
      batch.set(doc(LEGACY(), id), { ...published, createdAt: serverTimestamp() });
      batch.update(doc(SUBMISSIONS(), id), { status: 'approved', moderatedAt: serverTimestamp() });
      await batch.commit();
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

export async function rejectSubmission(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('exam_review_submissions')
        .update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await updateDoc(doc(SUBMISSIONS(), id), { status: 'rejected', moderatedAt: serverTimestamp() });
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

async function getSubmission(id) {
  return withFallback(
    async () => {
      const { data, error } = await supabase.from('exam_review_submissions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return toSubmission(data);
    },
    async () => {
      const snap = await getDoc(doc(SUBMISSIONS(), id));
      return snap.exists() ? fbItem(snap) : null;
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

/** Legacy admin-curated reviews (ExamPaperReviewManager second collection). */
export async function listLegacyReviews({ subject, term, limit: max = 200 } = {}) {
  const key = CACHE_PREFIX + 'legacy|' + (subject || '-') + '|' + (term || '-') + '|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        let q = supabase.from('exam_reviews').select('*');
        if (subject) q = q.eq('subject', subject);
        if (term) q = q.eq('term', term);
        const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toLegacy);
      },
      async () => {
        const parts = [];
        if (subject) parts.push(where('subject', '==', subject));
        if (term) parts.push(where('term', '==', term));
        parts.push(limit(max));
        const snap = await getDocs(query(LEGACY(), ...parts));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['exam_reviews_'] }
    );});
}

export async function updateLegacyReview(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const row = toLegacyRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('exam_reviews').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(LEGACY(), id), { ...rest });
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

export async function deleteLegacyReview(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('exam_reviews').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(LEGACY(), id));
    },
    { cacheKeys: ['exam_reviews_'] }
  );
}

// ---- feedback reports on public reviews (ExamPaperCommunity report button) ----

/** File a private report about a public exam review. Returns the id. */
export async function submitFeedbackReport({ userId, reviewId, reviewCollection, reason }) {
  clearCachedPrefix('feedback_');
  return withFallback(
    async () => {
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
    },
    async () => {
      const ref = await addDoc(FEEDBACK(), {
        userId, category: 'exam-review-report', reviewId, reviewCollection, reason,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    { cacheKeys: ['feedback_'] }
  );
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
