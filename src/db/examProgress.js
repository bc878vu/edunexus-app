// src/db/examProgress.js — per-user MCQ practice progress adapter.
//
// Postgres: exam_progress (plan §1 table 20). The whole payload blob
// lives in the `payload` jsonb column; subject/term are extracted for indexing.
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).

import { supabase, nowIso } from './_common.js';

/** Read saved progress for (userId, key). Returns the payload object or null. */
export async function getProgress(userId, key) {
  if (!userId || !key) return null;
  const { data, error } = await supabase.from('exam_progress').select('payload')
    .eq('user_id', userId).eq('id', key).maybeSingle();
  if (error) throw error;
  return data ? data.payload : null;
}

/** Overwrite progress (upsert). Payload shape is owned by ExamMcqPractice. */
export async function saveProgress(userId, key, payload) {
  if (!userId || !key) throw new Error('userId and key are required');
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
}
