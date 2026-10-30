import { validateTestPaperBank } from './testPaperBankValidate';
import { mergeBankSubjects, mergeCatalog } from './testPaperBankMerge';

const goodBank = {
  code: 'ACC501',
  title: 'Business Finance',
  term: 'Midterm',
  lectures: [
    { n: 1, title: 'Introduction' },
    { n: 2, title: 'Why Study Finance?' },
  ],
  mcqs: [
    {
      id: 'Q001',
      q: 'Business Finance addresses which of the following?',
      options: [
        { letter: 'A', text: 'Capital budgeting' },
        { letter: 'B', text: 'Capital structure' },
        { letter: 'C', text: 'Working capital management' },
        { letter: 'D', text: 'All of the given' },
      ],
      answer: 'D',
      explanation: 'All three are finance decisions.',
      lectures: [1],
      concept: 'finance scope',
    },
  ],
  shorts: [
    { id: 'S01', q: 'What is NWC?', modelAnswer: 'Current assets minus current liabilities.', lectures: [2] },
  ],
  longs: [],
};

test('valid bank passes with counts', () => {
  const r = validateTestPaperBank(goodBank);
  expect(r.valid).toBe(true);
  expect(r.counts).toEqual({ mcqs: 1, shorts: 1, longs: 0, lectures: 2 });
  expect(r.bank.scope).toBe('Lectures 1–2');
});

test('validator rejects bad code, 3 options, bad answer, unknown lecture', () => {
  const bad = {
    ...goodBank,
    code: 'X',
    mcqs: [{ ...goodBank.mcqs[0], options: goodBank.mcqs[0].options.slice(0, 3), answer: 'E', lectures: [99] }],
  };
  const r = validateTestPaperBank(bad);
  expect(r.valid).toBe(false);
  expect(r.errors.join(' ')).toMatch(/not a valid subject code/);
  expect(r.errors.join(' ')).toMatch(/exactly 4/);
  expect(r.errors.join(' ')).toMatch(/one of A, B, C, D/);
  expect(r.errors.join(' ')).toMatch(/not a declared lecture/);
});

test('validator rejects duplicate ids across lists', () => {
  const bad = { ...goodBank, shorts: [{ ...goodBank.shorts[0], id: 'Q001' }] };
  const r = validateTestPaperBank(bad);
  expect(r.valid).toBe(false);
  expect(r.errors.join(' ')).toMatch(/duplicate id/);
});

test('unitLabel Topic accepted with Topics scope, Lecture default kept', () => {
  const topic = validateTestPaperBank({ ...goodBank, unitLabel: 'Topic' });
  expect(topic.valid).toBe(true);
  expect(topic.bank.unitLabel).toBe('Topic');
  expect(topic.bank.scope).toBe('Topics 1–2');
  const def = validateTestPaperBank(goodBank);
  expect(def.bank.unitLabel).toBe('Lecture');
  expect(def.bank.scope).toBe('Lectures 1–2');
});

test('unitLabel rejects other values', () => {
  const r = validateTestPaperBank({ ...goodBank, unitLabel: 'Module' });
  expect(r.valid).toBe(false);
  expect(r.errors.join(' ')).toMatch(/unitLabel must be/);
});

test('merge: admin bank replaces code bank, new code is added, catalog flips to live', () => {
  const code = [
    { code: 'PHY101', term: 'Midterm', title: 'Physics', scope: 'Lectures 1–22', lectures: [], bank: { mcqs: [], shorts: [], longs: [] } },
    { code: 'ACC501', term: 'Midterm', title: 'Business Finance', scope: 'Lectures 1–22', lectures: [], bank: { mcqs: [{ id: 'Q1' }], shorts: [], longs: [] } },
  ];
  const admin = [{ code: 'ACC501', term: 'Midterm', title: 'Business Finance', scope: 'Lectures 1–22', lectures: [], mcqs: [{ id: 'Q9' }], shorts: [], longs: [] }];
  const merged = mergeBankSubjects(code, admin);
  expect(merged.map((s) => s.code)).toEqual(['PHY101', 'ACC501']);
  expect(merged.find((s) => s.code === 'ACC501').fromAdmin).toBe(true);
  expect(merged.find((s) => s.code === 'ACC501').bank.mcqs).toEqual([{ id: 'Q9' }]);
  const catalog = mergeCatalog(
    [{ code: 'PHY101', status: 'live' }, { code: 'ACC501', status: 'mapping' }, { code: 'CS101', status: 'mapping' }],
    merged,
  );
  expect(catalog.find((c) => c.code === 'ACC501').status).toBe('live');
  expect(catalog.find((c) => c.code === 'CS101').status).toBe('mapping');
});
