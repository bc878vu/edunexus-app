// Denormalized exam-catalogue counts — Supabase-backed.
//
// WHAT IS THE CATALOGUE?
// The public Exam Prep page shows, for every subject, how many questions exist
// in each category (Quiz / Midterm / Finalterm) — e.g. "MGT610 · Midterm 126".
// Counting 21,000+ questions on every page visit would be slow, so the counts
// are pre-computed into the small exam_catalog table and the page reads that
// single table instead. The admin "Refresh Catalogue" button recounts every
// subject straight from the question bank and updates the table, so the public
// numbers always match the actual bank. Use it after imports, deletions, or
// whenever the public counts look wrong.
//
// Each subject is recomputed with cheap count() aggregations — never
// blind-incremented — so the catalogue cannot drift from the question bank.
//
// The catalogue lives in Supabase (not the old Firestore meta/examCatalog
// document): the admin's Supabase session can write it, while Firestore admin
// writes need a verified Firebase email.
import { supabase } from './supabase-client.js';
import { EXAM_CATEGORIES } from './examCatalog';

const COURSE = /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/;

async function countFromSupabase(subject, category) {
  const { count: n, error } = await supabase
    .from('exam_mcqs')
    .select('id', { count: 'exact', head: true })
    .eq('subject', subject)
    .eq('term', category);
  if (error) throw error;
  return Number(n) || 0;
}

// Every subject code currently present in the question bank.
export async function listCatalogSubjects() {
  const { data, error } = await supabase.from('exam_mcqs').select('subject').limit(30000);
  if (error) throw error;
  const set = new Set();
  (data || []).forEach((r) => {
    const s = String(r.subject || '').trim().toUpperCase();
    if (COURSE.test(s)) set.add(s);
  });
  return [...set].sort();
}

// Read the whole catalogue in one cheap query.
// Returns { bySubject: { MGT610: { quiz, midterm, finalterm } }, updatedAt }.
export async function readCatalogFromSupabase() {
  const { data, error } = await supabase
    .from('exam_catalog')
    .select('subject, quiz, midterm, finalterm, updated_at');
  if (error) throw error;
  const bySubject = {};
  let updatedAt = null;
  (data || []).forEach((row) => {
    const subject = String(row.subject || '').trim().toUpperCase();
    if (!COURSE.test(subject)) return;
    bySubject[subject] = {
      quiz: Number(row.quiz) || 0,
      midterm: Number(row.midterm) || 0,
      finalterm: Number(row.finalterm) || 0,
    };
    if (row.updated_at && (!updatedAt || row.updated_at > updatedAt)) updatedAt = row.updated_at;
  });
  return { bySubject, updatedAt };
}

// Recount subjects from the question bank and upsert them into exam_catalog.
// `subjects`: array of codes, or 'all'/undefined to discover every subject.
// Returns { updated: [codes], total: <question count>, updatedAt }.
export async function refreshExamCatalogCounts(subjects, opts = {}) {
  let list;
  if (!subjects || subjects === 'all') {
    list = await listCatalogSubjects();
  } else {
    list = [...new Set((Array.isArray(subjects) ? subjects : [subjects])
      .map((v) => String(v || '').trim().toUpperCase())
      .filter((v) => COURSE.test(v)))];
  }
  if (!list.length) return { updated: [], total: 0, updatedAt: null };
  const now = new Date().toISOString();
  const rows = [];
  for (const subject of list) {
    const row = { subject, quiz: 0, midterm: 0, finalterm: 0, updated_at: now };
    for (const category of EXAM_CATEGORIES) {
      row[category] = await countFromSupabase(subject, category);
    }
    rows.push(row);
  }
  const { error } = await supabase.from('exam_catalog').upsert(rows, { onConflict: 'subject' });
  if (error) {
    if (error.code === '42P01') {
      throw new Error('The exam_catalog table does not exist yet. Create it once from the SQL shown in the Exam Catalogue section, then refresh again.');
    }
    throw error;
  }
  const total = rows.reduce((n, r) => n + r.quiz + r.midterm + r.finalterm, 0);
  return { updated: rows.map((r) => r.subject), total, updatedAt: now };
}
