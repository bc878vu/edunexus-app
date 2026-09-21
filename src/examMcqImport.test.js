import { categoryOf, isQuizSource, orderOf, parseMcqJson, summarizeImport, validateMcq } from './examMcqImport';

const base = (overrides = {}) => ({
  subject: 'CS620', term: 'midterm',
  question: 'What is a discrete event?', options: ['Event', 'A state', 'A clock', 'None'],
  answer: 0, explanation: 'Solved Quiz 1 (20 questions); original question #1. Quiz-practice item listed under Midterm because the site has no Quiz category.',
  ...overrides
});
test('legacy CS620 quiz sources appear under Quiz and retain exact options/answer/sequence', () => {
  const originals = [
    base(),
    base({ question: 'Which state is first?', explanation: 'Quiz 1, 08 September 2026 (10 questions); original question #1. PROVISIONAL ANSWER: the supplied PDF has no answer key.', answer: 2 }),
    base({ question: 'Which agent model?', explanation: 'Quiz 2, 25 June 2026 (12 questions); original question #12.', answer: 3 })
  ];
  const output = originals.map((item, i) => validateMcq(item, i, { forImport: true }));
  expect(output.map(categoryOf)).toEqual(['quiz', 'quiz', 'quiz']);
  expect(output.map(orderOf)).toEqual([1, 2, 3]);
  expect(output.map((item) => item.question)).toEqual(originals.map((item) => item.question));
  expect(output.map((item) => item.options)).toEqual(originals.map((item) => item.options));
  expect(output.map((item) => item.answer)).toEqual([0, 2, 3]);
  expect(output.every((item) => item.term === 'midterm')).toBe(true); // current Firestore rules are unchanged
  expect(output[0].explanation).not.toContain('site has no Quiz category');
});
test('genuine midterm and finalterm questions remain separate from Quiz', () => {
  const mid = base({ explanation: 'Lecture 1 preparation note.' });
  const fin = base({ term: 'finalterm', explanation: 'Finalterm study note.' });
  expect(categoryOf(validateMcq(mid))).toBe('midterm');
  expect(categoryOf(validateMcq(fin))).toBe('finalterm');
});
test('never silently publish missing or null answers as option A', () => {
  expect(() => validateMcq(base({ answer: null }))).toThrow(/answer index/);
  expect(() => validateMcq(base({ answer: undefined }))).toThrow(/answer index/);
  expect(() => validateMcq(base({ answer: '0' }))).toThrow(/answer index/);
  expect(() => validateMcq(base({ options: ['A','B','C'] }))).toThrow(/four/);
});
test('accepts one 42-question JSON file but rejects oversized batches and invalid JSON', () => {
  const items = Array.from({ length: 42 }, (_, i) => base({ question: 'Question ' + (i+1) }));
  const parsed = parseMcqJson(JSON.stringify(items));
  expect(parsed).toHaveLength(42);
  expect(summarizeImport(parsed)).toMatchObject({ count:42, totals:{quiz:42,midterm:0,finalterm:0}, subjects:['CS620'] });
  expect(() => parseMcqJson(JSON.stringify(Array.from({ length:51 }, (_, i) => base({ question:'Q '+i }))))).toThrow(/1–50/);
  expect(() => parseMcqJson('[{"broken"')).toThrow(/Invalid JSON/);
});
test('counts provisional answers and conflicting solved source keys before publishing', () => {
  const items = [
    base({ explanation:'Quiz 2 (12 questions). PROVISIONAL ANSWER: no key supplied.' }),
    base({ explanation:'Solved Quiz 1 (20 questions). The conflict requires confirmation.' })
  ];
  expect(summarizeImport(items)).toMatchObject({ provisional:1, answerConflicts:1, totals:{quiz:2,midterm:0,finalterm:0} });
});
