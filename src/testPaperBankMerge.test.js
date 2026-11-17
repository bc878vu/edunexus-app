// src/testPaperBankMerge.test.js — a subject with two banks (Midterm +
// Finalterm) must keep both terms and get exactly ONE catalog entry.
// Regression test for the 2026-11-17 MGT522 Finalterm invisibility bug:
// mergeCatalog pushed one entry per bank (the `known` set was never
// updated), so the home page rendered the Midterm card twice and the
// Finalterm bank was unreachable from the home page and the builder.
import { mergeBankSubjects, mergeCatalog } from './testPaperBankMerge';

const bank = (code, term) => ({
  code, title: 'T', term, unitLabel: 'Topic', scope: 's',
  lectures: [{ n: 1, title: 'L1' }], mcqs: [], shorts: [], longs: [],
});

describe('mergeBankSubjects', () => {
  it('keeps both terms for the same code', () => {
    const merged = mergeBankSubjects([], [bank('MGT522', 'Midterm'), bank('MGT522', 'Finalterm')]);
    expect(merged.map((s) => `${s.code}::${s.term}`)).toEqual(['MGT522::Midterm', 'MGT522::Finalterm']);
  });

  it('an admin bank replaces the code bank for the same code+term', () => {
    const merged = mergeBankSubjects([bank('CS101', 'Midterm')], [bank('CS101', 'Midterm')]);
    expect(merged).toHaveLength(1);
    expect(merged[0].fromAdmin).toBe(true);
  });
});

describe('mergeCatalog', () => {
  it('adds one catalog entry per code even with two banks', () => {
    const subjects = mergeBankSubjects([], [bank('MGT522', 'Midterm'), bank('MGT522', 'Finalterm')]);
    expect(mergeCatalog([], subjects)).toEqual([{ code: 'MGT522', status: 'live' }]);
  });

  it('marks existing catalog codes live without duplicating them', () => {
    const subjects = mergeBankSubjects([], [bank('CS101', 'Midterm'), bank('CS101', 'Finalterm')]);
    expect(mergeCatalog([{ code: 'CS101', status: 'mapping' }], subjects))
      .toEqual([{ code: 'CS101', status: 'live' }]);
  });
});
