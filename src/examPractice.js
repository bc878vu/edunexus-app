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


// The displayed practice score follows the stored uploaded answer indexes.
// This must not be described as independent source verification.
// Answer selections are immutable within an attempt; only a new attempt resets them.
export function recordAnswer(answers, id, option) {
  if (typeof id !== 'string' || !Number.isInteger(option) || option < 0 || option > 3 ||
      Object.prototype.hasOwnProperty.call(answers, id)) return answers;
  return { ...answers, [id]: option };
}

// Keep the Next button and its handler on the same rule. A previously
// answered question can be revisited without unlocking its answer.
export function canAdvance(questions, answers, index) {
  return index >= 0 && index < questions.length - 1 &&
    Number.isInteger(answers[questions[index]?.id]);
}

export function answerKeyStats(questions, answers) {
  const answered = questions.filter(q => Number.isInteger(answers[q.id]));
  return {
    answered: answered.length,
    score: answered.filter(q => answers[q.id] === q.answer).length,
    total: questions.length,
    unanswered: questions.length - answered.length,
    sourceUnreviewed: answered.filter(q => !isVerifiedAnswer(q)).length
  };
}
export function buildPracticeAttempt(questions, count = 'all', mode = 'sequence', random = Math.random) {
  const seen = new Set();
  const unique = questions.filter(q => {
    if (typeof q?.id !== 'string') return false;
    const key = String(q.question || '').toLowerCase().replace(/\\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const wanted = count === 'all' ? unique.length : Math.min(unique.length, Math.max(1, Number(count) || unique.length));
  const items = unique.slice();
  if (mode === 'random') {
    for (let i=items.length-1;i>0;i--) {
      const j = Math.max(0, Math.min(i, Math.floor(random()*(i+1))));
      [items[i],items[j]] = [items[j],items[i]];
    }
  }
  return items.slice(0,wanted).map(q => q.id);
}
export function restoreAttemptIds(record, questions) {
  const available = new Set(questions.map(q=>q.id));
  const saved = Array.isArray(record?.attemptIds) ? record.attemptIds : null;
  if (!saved?.length) return buildPracticeAttempt(questions); // existing v2 attempts retain original order
  const byId = new Map(questions.map(q=>[q.id,q]));
  const seenQuestions = new Set();
  return [...new Set(saved.filter(id => typeof id === 'string' && available.has(id)))].filter(id => {
    const key = String(byId.get(id)?.question || '').toLowerCase().replace(/\\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();
    if (seenQuestions.has(key)) return false;
    seenQuestions.add(key);
    return true;
  });
}
export function attemptMessage(score, answered, total = answered) {
  if (!answered) return 'Try again! Start with a few questions and build your confidence.';
  if (total > answered && answered / total < .5)
    return 'You finished early. Answer more questions next time to track your progress.';
  const rate = score / answered;
  if (rate >= .9) return 'Congratulations! Excellent work. Keep practicing!';
  if (rate >= .65) return 'Good progress! Review a few concepts and try again.';
  if (rate >= .4) return 'Keep going! A little more revision will help.';
  return 'Keep practicing. Review each explanation and try again!';
}
