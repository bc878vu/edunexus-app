// Firestore's existing examMcqs rule accepts midterm/finalterm only.
// Quiz entries remain compatible with those published rules by storing the
// physical term as midterm PLUS an explicit, reversible Quiz marker in explanation.
// The UI never presents such items as Midterm material.
export const QUIZ_MARKER = '[EduNexus Quiz';
export const isQuizSource = (item) => {
  const explanation = String(item?.explanation || '');
  if (/^\[EduNexus (?:Midterm|Finalterm)\]/.test(explanation)) return false;
  return item?.term === 'quiz' || explanation.startsWith(QUIZ_MARKER) ||
    /quiz-practice item listed under midterm|(?:^|[.;]\s*)(?:solved\s+)?quiz\s*(?:no\.?\s*)?\d+/i.test(explanation);
};
export const categoryOf = (item) => {
  const match = String(item?.explanation || '').match(/^\[EduNexus (Midterm|Finalterm)\]/);
  if (match) return match[1].toLowerCase();
  return isQuizSource(item) ? 'quiz' : item?.term;
};
export const orderOf = (item) => {
  const found = String(item?.explanation || '').match(/^\[EduNexus Quiz(?:\|set:[A-Z0-9_-]{1,40})?(?:\|order:([0-9]{4}))?\]/);
  return found?.[1] ? Number(found[1]) : null;
};
const normalizeCode = (v) => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const validCourse = (v) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(v);
export const MAX_IMPORT = Number.MAX_SAFE_INTEGER;
export const MAX_JSON_BYTES = 32 * 1024 * 1024;
export const quizSetName = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
export const quizSetOf = item => {
  if (categoryOf(item) !== 'quiz') return '';
  const match = String(item?.explanation || '').match(/^\[EduNexus Quiz\|set:([A-Z0-9_-]{1,40})(?:\|order:[0-9]{4})?\]/);
  if (match) return match[1];
  const legacy = String(item?.explanation || '').match(/\b(?:solved\s+)?quiz\s*(?:no\.?\s*)?(\d{1,3})\b/i);
  return legacy ? 'QUIZ-' + legacy[1] : 'GENERAL-QUIZ';
};
export const stripQuizMarker = value => String(value || '').replace(/^\[EduNexus Quiz(?:\|set:[A-Z0-9_-]{1,40})?(?:\|order:[0-9]{4})?\]\s*/, '');
const outdatedTag = /Quiz-practice item listed under Midterm because the site has no Quiz category\./gi;

// Accept the exact four-option source schema without rewriting mathematical text.
// Missing options are reported for review rather than fabricated.
export function normalizeImportedMcq(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  const options = item.options && !Array.isArray(item.options) && typeof item.options === 'object'
    ? ['A','B','C','D'].map(key => item.options[key])
    : item.options;
  const key = typeof item.correct_option === 'string' ? item.correct_option.trim().toUpperCase() : '';
  const answer = Number.isInteger(item.answer) ? item.answer
    : /^[A-D]$/.test(key) ? key.charCodeAt(0) - 65 : null;
  const actual = Array.isArray(options) && answer !== null ? options[answer] : null;
  const sourceAnswer = item.correct_answer;
  const answerMismatch = typeof sourceAnswer === 'string' && typeof actual === 'string'
    && sourceAnswer.trim() !== actual.trim();
  return { ...item, options, answer, answerMismatch };
}
export function suggestImportMetadata(filename, items = []) {
  const name = String(filename || '').toLowerCase();
  const subject = name.match(/(?:^|[^a-z0-9])([a-z]{2,5}[0-9]{3}[a-z]?)(?=[^a-z0-9]|$)/i)?.[1]?.toUpperCase() || '';
  const categories = [...new Set(items.map(item => categoryOf(item)).filter(v => ['quiz','midterm','finalterm'].includes(v)))];
  const filenameCategory = /(?:final[ _-]?term|finals?)/i.test(name) ? 'finalterm'
    : /(?:mid[ _-]?term|mids?)/i.test(name) ? 'midterm'
    : /(?:quiz|quizzes)/i.test(name) ? 'quiz' : '';
  return { subject, category: categories.length > 1 ? 'mixed' : filenameCategory || categories[0] || 'mixed' };
}

export function parseMcqJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Paste JSON or choose a .json file to import.');
  if (new Blob([text]).size > MAX_JSON_BYTES) throw new Error('JSON exceeds the 32 MiB browser safety limit. Split this file into smaller JSON files.');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (error) { throw new Error('Invalid JSON: ' + error.message); }
  if (!Array.isArray(parsed) || parsed.length < 1) {
    throw new Error('Provide a nonempty JSON array of questions.');
  }
  return parsed.map(normalizeImportedMcq);
}
export function validateMcq(item, index = 0, { forImport = false } = {}) {
  const fail = (reason) => { throw new Error('Question ' + (index + 1) + ': ' + reason); };
  if (!item || typeof item !== 'object' || Array.isArray(item)) fail('expected an object.');
  const subject = normalizeCode(item.subject);
  const category = categoryOf(item);
  if (!validCourse(subject)) fail('invalid subject code; use e.g. CS620.');
  if (!['quiz', 'midterm', 'finalterm'].includes(category)) fail('exam type must be quiz, midterm or finalterm.');
  if (typeof item.question !== 'string' || !item.question.trim() || item.question.trim().length > 1000) fail('question must contain 1–1000 characters.');
  if (!Array.isArray(item.options) || item.options.length !== 4 ||
      item.options.some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 350)) {
    fail('provide exactly four nonempty string options of at most 350 characters each.');
  }
  // Number(null) === 0, so avoid silently publishing unanswered questions as A.
  if (typeof item.answer !== 'number' || !Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) {
    fail('a verified numeric answer index (0–3) is required. Blank/null answers cannot be published.');
  }
  if (item.explanation != null && typeof item.explanation !== 'string') fail('explanation must be a string.');
  let explanation = String(item.explanation || '').trim();
  // Explicit non-Quiz markers must remain in Firestore: older notes may
  // mention Quiz 1 even when the administrator reclassified this question.
  if (category === 'quiz') {
    const originalOrder = orderOf(item);
    explanation = stripQuizMarker(explanation).replace(outdatedTag, '').trim();
    const set = quizSetName(item.quizSet || quizSetOf(item));
    const order = forImport ? index + 1 : originalOrder;
    const marker = '[EduNexus Quiz' + (set ? '|set:' + set : '') + (order != null ? '|order:' + String(order).padStart(4, '0') : '') + ']';
    explanation = marker + (explanation ? ' ' + explanation : '');
  }
  if (explanation.length > 1000) fail('explanation exceeds the 1000-character Firestore limit.');
  return {
    subject, term: category === 'quiz' ? 'midterm' : category,
    question: item.question.trim(), options: item.options.map((v) => v.trim()),
    answer: item.answer, explanation
  };
}
export function summarizeImport(items) {
  const totals = { quiz: 0, midterm: 0, finalterm: 0 };
  const subjects = new Set();
  let provisional = 0;
  let answerConflicts = 0;
  items.forEach((item, i) => {
    validateMcq(item, i, { forImport: true });
    totals[categoryOf(item)]++;
    subjects.add(normalizeCode(item.subject));
    if (/PROVISIONAL ANSWER|unverified answer|not confirmed by the uploaded file/i.test(item.explanation || '')) provisional++;
    if (/conflict requires confirmation|answer.key discrepancy|marks option .+ marks option/i.test(item.explanation || '')) answerConflicts++;
  });
  return { count: items.length, totals, subjects: [...subjects], provisional, answerConflicts };
}
