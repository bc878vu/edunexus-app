import { categoryOf } from './examMcqImport';

export const EXAM_CATEGORIES = ['quiz', 'midterm', 'finalterm'];
export const EXAM_SUBJECT_LIMIT = 1500;

// Keep a low-cost live catalogue on the exam page. The Firestore collection
// remains the source of truth; do not infer published questions from a static
// course list or from the number of files in Academic Hub.
export function publishedExamCatalog(documents = []) {
  const bySubject = {};
  (documents || []).forEach(entry => {
    const q = entry?.data ? entry.data() : entry;
    const subject = String(q?.subject || '').trim().toUpperCase();
    const category = categoryOf(q);
    if (!/^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(subject) || !EXAM_CATEGORIES.includes(category) ||
      !q?.question || !Array.isArray(q.options) || q.options.length !== 4) return;
    if (!bySubject[subject]) bySubject[subject] = { quiz: 0, midterm: 0, finalterm: 0 };
    bySubject[subject][category]++;
  });
  const subjects = Object.keys(bySubject).sort((a, b) => a.localeCompare(b, undefined, { numeric:true }));
  return { subjects, bySubject, total: subjects.reduce((n,s) =>
    n + EXAM_CATEGORIES.reduce((sum, category) => sum + bySubject[s][category],0),0) };
}
export function firstAvailableExam(catalog, subject, term) {
  const counts = catalog.bySubject[subject];
  if (counts?.[term]) return { subject, term };
  if (counts) {
    const next = EXAM_CATEGORIES.find(category => counts[category] > 0);
    if (next) return { subject, term:next };
  }
  const firstSubject = catalog.subjects[0];
  if (!firstSubject) return null;
  const next = EXAM_CATEGORIES.find(category => catalog.bySubject[firstSubject][category] > 0);
  return next ? { subject:firstSubject, term:next } : null;
}

// Builds the same catalogue shape as publishedExamCatalog from the denormalized
// meta/examCatalog document ({ bySubject: { CS609: { quiz, midterm, finalterm } },
// updatedAt }), so ExamPrepHub can read one document instead of scanning up to
// EXAM_SUBJECT_LIMIT MCQ documents. Returns an empty catalogue when the document
// is missing or malformed; callers fall back to the legacy document scan.
export function catalogFromCounts(data) {
  const raw = (data && typeof data.bySubject === 'object' && data.bySubject) || {};
  const bySubject = {};
  Object.keys(raw).forEach(key => {
    const subject = String(key || '').trim().toUpperCase();
    if (!/^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(subject)) return;
    const counts = raw[key] || {};
    const entry = { quiz: 0, midterm: 0, finalterm: 0 };
    EXAM_CATEGORIES.forEach(category => {
      const value = Number(counts[category]);
      entry[category] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });
    if (entry.quiz + entry.midterm + entry.finalterm > 0) bySubject[subject] = entry;
  });
  const subjects = Object.keys(bySubject).sort((a, b) => a.localeCompare(b, undefined, { numeric:true }));
  return { subjects, bySubject, total: subjects.reduce((n,s) =>
    n + EXAM_CATEGORIES.reduce((sum, category) => sum + bySubject[s][category],0),0) };
}
