// Firestore's existing examMcqs rule accepts midterm/finalterm only.
// Quiz entries remain compatible with those published rules by storing the
// physical term as midterm PLUS an explicit, reversible Quiz marker in explanation.
// The UI never presents such items as Midterm material.
export const QUIZ_MARKER = '[EduNexus Quiz';
export const isQuizSource = (item) => {
  const explanation = String(item?.explanation || '');
  return item?.term === 'quiz' || explanation.startsWith(QUIZ_MARKER) ||
    /quiz-practice item listed under midterm|(?:^|[.;]\s*)(?:solved\s+)?quiz\s*(?:no\.?\s*)?\d+/i.test(explanation);
};
export const categoryOf = (item) => isQuizSource(item) ? 'quiz' : item?.term;
export const orderOf = (item) => {
  const found = String(item?.explanation || '').match(/^\[EduNexus Quiz(?:\|order:([0-9]{4}))?\]/);
  return found?.[1] ? Number(found[1]) : null;
};
const normalizeCode = (v) => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const validCourse = (v) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(v);
export const MAX_IMPORT = 50;
export const MAX_JSON_BYTES = 1024 * 1024;
const outdatedTag = /Quiz-practice item listed under Midterm because the site has no Quiz category\./gi;
export function parseMcqJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Paste JSON or choose a .json file to import.');
  if (text.length > MAX_JSON_BYTES) throw new Error('JSON is too large; use a batch of up to 50 questions.');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (error) { throw new Error('Invalid JSON: ' + error.message); }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_IMPORT) {
    throw new Error('Provide a JSON array containing 1–50 questions.');
  }
  return parsed;
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
  if (category === 'quiz') {
    explanation = explanation.replace(/^\[EduNexus Quiz(?:\|order:[0-9]{4})?\]\s*/, '').replace(outdatedTag, '').trim();
    const marker = '[EduNexus Quiz' + (forImport ? '|order:' + String(index + 1).padStart(4, '0') : '') + ']';
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
