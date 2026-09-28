// src/db/examProgress.js — per-user MCQ practice progress adapter.
//
// Firestore today:  users/{uid}/examProgress/{key}   (key = subject_term[_set_X],
//   written as a debounced full overwrite by ExamMcqPractice)
// Postgres target:  exam_progress (plan §1 table 20). The whole payload blob
// lives in the `payload` jsonb column; subject/term are extracted for indexing.

import {
  doc, getDoc, setDoc,
  supabase, USE_SUPABASE, db,
  nowIso,
} from './_common.js';

const progressDoc = (userId, key) =>
  doc(db, 'artifacts', 'edunexus-live', 'users', userId, 'examProgress', key);

/** Read saved progress for (userId, key). Returns the payload object or null. */
export async function getProgress(userId, key) {
  if (!userId || !key) return null;
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('exam_progress').select('payload')
      .eq('user_id', userId).eq('id', key).maybeSingle();
    if (error) throw error;
    return data ? data.payload : null;
  }
  const snap = await getDoc(progressDoc(userId, key));
  return snap.exists() ? snap.data() : null;
}

/** Overwrite progress (upsert). Payload shape is owned by ExamMcqPractice. */
export async function saveProgress(userId, key, payload) {
  if (!userId || !key) throw new Error('userId and key are required');
  if (USE_SUPABASE) {
    const row = {
      id: key,
      user_id: userId,
      subject: payload?.subject ?? null,
      term: payload?.term ?? null,
      payload: payload ?? {},
      updated_at: nowIso(),
    };
    const { error } = await supabase.from('exam_progress').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return;
  }
  await setDoc(progressDoc(userId, key), { ...(payload || {}) });
}
