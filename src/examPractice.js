import { categoryOf, orderOf, quizSetOf } from './examMcqImport';

export const CATEGORY_NAMES = { quiz: 'Quiz', midterm: 'Midterm', finalterm: 'Finalterm' };
export const QUESTION_LIMIT = 1000;
export function isVerifiedAnswer(question) {
  // A supplied answer index is not independent evidence of correctness.
  // Older/imported keys remain provisional until a verified administrator
  // reviews a named source. Do not show an inferred option in green.
  const text = String(question?.explanation || '');
  const marker = '[EduNexus admin verified] Admin review source: ';
  const source = text.split(marker).pop().trim();
  return text.includes(marker) && source.length >= 12;
}
export function orderedQuestions(items, term) {
  const valid = items.filter(q => categoryOf(q) === term &&
    Array.isArray(q.options) && q.options.length === 4 &&
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && q.question);
  // Never randomize source order. The Quiz marker keeps the original batch
  // sequence; older items have deterministic createdAt/id tie breakers.
  return valid.sort((a, b) => {
    if (term === 'quiz') {
      const group = quizSetOf(a).localeCompare(quizSetOf(b), undefined, {numeric:true});
      if (group !== 0) return group;
      const aOrder = orderOf(a), bOrder = orderOf(b);
      if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== null && bOrder === null) return -1;
      if (aOrder === null && bOrder !== null) return 1;
    }
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return aTime - bTime || String(a.id).localeCompare(String(b.id));
  });
}
export function practiceStats(questions, answers) {
  let checked = 0, score = 0, provisional = 0;
  questions.forEach(q => {
    if (answers[q.id] === undefined) return;
    if (!isVerifiedAnswer(q)) { provisional++; return; }
    checked++;
    if (answers[q.id] === q.answer) score++;
  });
  return { answered: questions.filter(q => answers[q.id] !== undefined).length, checked, score, provisional,
    unattempted: questions.filter(q => answers[q.id] === undefined).length };
}
export const progressKey = (subject, term, uid = 'guest') => 'edunexus:exam:v2:' + uid + ':' + subject + ':' + term;
// Stable identifiers remain valid even if additional questions are published.
export function sanitizeProgress(record, questions) {
  const ids = new Set(questions.map(q => q.id));
  const answers = {};
  if (record?.answers && typeof record.answers === 'object') {
    Object.entries(record.answers).forEach(([id, answer]) => {
      if (ids.has(id) && Number.isInteger(answer) && answer >= 0 && answer <= 3) answers[id] = answer;
    });
  }
  const matching = typeof record?.currentId === 'string' && ids.has(record.currentId);
  return { answers, currentId: matching ? record.currentId : (questions[0]?.id || null), finished: record?.finished === true };
}
