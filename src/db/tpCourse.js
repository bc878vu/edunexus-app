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
