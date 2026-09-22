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
