// src/db/paperAttempts.js — student test-paper attempts, stored in Supabase.
//
// User decision 2026-10-30: ALL site storage moves to Supabase (Firebase
// gives no free storage). This replaces the Firestore version. The old
// comment's rationale (Firebase admin identity) no longer applies: like the
// MCQ bank, admin gating is UI-level in the admin panel and the table
// policies are anon-friendly.
//
// Table `paper_attempts` (created by
// ~/workspace/testpapers/supabase-testpaper-admin.sql, run by the user):
// snake_case columns; rows are mapped back to the camelCase shape the UI
// already expects (AdminPaperAttempts, Dashboard, Students), so no UI
// component changes. created_at/updated_at come back as ISO strings, which
// the existing date helpers already accept.

import { supabase } from './_common.js';

const TABLE = 'paper_attempts';

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Supabase row -> attempt (the shape the UI already renders). Pure. */
export function mapAttemptRow(row) {
  return {
    id: row.id,
    userId: row.user_id || '',
    studentName: row.student_name || '',
    studentVuId: row.student_vu_id || '',
    paperSlug: row.paper_slug || '',
    paperCode: row.paper_code || '',
    mcqAnswers: row.mcq_answers && typeof row.mcq_answers === 'object' ? row.mcq_answers : {},
    mcqScore: row.mcq_score ?? 0,
    mcqTotal: row.mcq_total ?? 0,
    shortAnswers: Array.isArray(row.short_answers) ? row.short_answers : [],
    longAnswers: Array.isArray(row.long_answers) ? row.long_answers : [],
    paperSnapshot: row.paper_snapshot || null,
    status: row.status || 'submitted',
    teacherMarks: row.teacher_marks ?? null,
    teacherFeedback: row.teacher_feedback || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function toRow(payload) {
  return {
    user_id: payload.userId || '',
    student_name: payload.studentName || '',
    student_vu_id: payload.studentVuId || '',
    paper_slug: payload.paperSlug || '',
    paper_code: payload.paperCode || '',
    mcq_answers: payload.mcqAnswers || {},
    mcq_score: payload.mcqScore ?? 0,
    mcq_total: payload.mcqTotal ?? 0,
    short_answers: payload.shortAnswers || {},
    long_answers: payload.longAnswers || {},
    paper_snapshot: payload.paperSnapshot || null,
  };
}

/** Submit a finished paper. Returns the new attempt id (the student receipt). */
export async function submitPaperAttempt(payload) {
  const id = newId();
  const { error } = await supabase.from(TABLE).insert({
    id,
    ...toRow(payload),
    status: 'submitted',
    teacher_marks: null,
    teacher_feedback: '',
  });
  if (error) throw error;
  return id;
}

/** Admin only (UI gate): newest attempts first. */
export async function listPaperAttempts(max = 200) {
  const { data, error } = await supabase.from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data || []).map(mapAttemptRow);
}

/** Owner or admin (UI gate). Returns null when missing. */
export async function getPaperAttempt(id) {
  if (!id) return null;
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapAttemptRow(data) : null;
}

/** Admin only (UI gate): save teacher marks + feedback, mark reviewed. */
export async function reviewPaperAttempt(id, { teacherMarks, teacherFeedback }) {
  const { error } = await supabase.from(TABLE).update({
    teacher_marks: teacherMarks || null,
    teacher_feedback: teacherFeedback || '',
    status: 'reviewed',
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}
