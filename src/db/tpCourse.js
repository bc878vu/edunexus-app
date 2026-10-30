// src/db/tpCourse.js — course-tests (tp_*) data layer, INSIDE EduNexus.
// There is no separate site: the test-papers system's tables live in the
// EduNexus Supabase project, and its admin + student flows live in this app.
// Auth model (two sessions, by design):
//   - The EduNexus admin panel gate stays Firebase (adminPanelAccess).
//   - tp_* admin rights come from a Supabase session (veducator4 or a
//     tp_admins row), because tp_* RLS checks the Supabase JWT email.
// Students use Supabase Auth too (signup gated by the access code in
// tp_settings, which is anon-readable by design).

import { supabase } from '../supabase-client.js';

export const TP_ROOT_ADMIN = 'veducator4@gmail.com';

export async function getTpSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onTpAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, s) => cb(s));
  return () => data?.subscription?.unsubscribe();
}

export async function signInTp(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOutTp() {
  await supabase.auth.signOut();
}

export async function isTpAdmin(session) {
  if (!session?.user) return false;
  if (session.user.email === TP_ROOT_ADMIN) return true;
  const { data, error } = await supabase.rpc('tp_is_admin');
  if (error) return false;
  return data === true;
}

async function tpCount(table) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function tpCounts() {
  const [subjects, mcqs, shorts, longs, attempts, profiles] = await Promise.all([
    tpCount('tp_subjects'), tpCount('tp_mcqs'), tpCount('tp_short_questions'),
    tpCount('tp_long_questions'), tpCount('tp_attempts'), tpCount('tp_profiles'),
  ]);
  return { subjects, mcqs, shorts, longs, attempts, profiles };
}

export async function listTpSubjects() {
  const { data, error } = await supabase.from('tp_subjects').select('id,code,name,term,scope').order('code');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTpAccessCode() {
  const { data, error } = await supabase.from('tp_settings').select('value').eq('key', 'access_code').maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value || '';
}

// ---- Student auth + content (Phase 2) ----
// Signup is gated by the access code in tp_settings (anon-readable).
// After signup the profile row is upserted; email confirmation (if the
// project requires it) happens via Supabase's own email before first login.

export async function signUpTp(email, password, accessCode) {
  const expected = await getTpAccessCode();
  if (!expected || accessCode.trim() !== expected) throw new Error('Access code ghalat hai. Admin se sahi code lein.');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (data.user) await upsertTpProfile(data.user);
  return data;
}

export async function upsertTpProfile(user) {
  if (!user) return;
  const { error } = await supabase.from('tp_profiles').upsert({ id: user.id, email: user.email }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function loadTpContent() {
  const [s, m, sh, lo] = await Promise.all([
    supabase.from('tp_subjects').select('*').order('code'),
    supabase.from('tp_mcqs').select('*').order('created_at'),
    supabase.from('tp_short_questions').select('*').order('created_at'),
    supabase.from('tp_long_questions').select('*').order('created_at'),
  ]);
  if (s.error) throw new Error(s.error.message);
  return { subjects: s.data || [], mcqs: m.data || [], shorts: sh.data || [], longs: lo.data || [] };
}

export async function readTpSettings() {
  const { data, error } = await supabase.from('tp_settings').select('key,value');
  if (error || !data) return { signup_open: true };
  const m = {};
  data.forEach((r) => { m[r.key] = r.value; });
  return { access_code: m.access_code ?? '', signup_open: m.signup_open !== 'false' };
}

export async function saveTpAttempt({ userId, subject, type, score, total, details }) {
  const { error } = await supabase.from('tp_attempts').insert({
    user_id: userId,
    subject_id: subject ? subject.id : null,
    subject_code: subject ? subject.code : '',
    type, score, total, details: details || {},
  });
  if (error) throw new Error(error.message);
}

export async function fetchTpMyAttempts(userId) {
  const { data, error } = await supabase.from('tp_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}
