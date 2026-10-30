import { attemptsPerDay, statsBySubject, scoreDistribution, groupStudents, attemptDate, attemptPct, mergeManualStudents } from './testPaperStats';

const day = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);
const A = (over) => ({ studentName: 'Asad', studentVuId: 'BC1', paperCode: 'ACC501', mcqScore: 16, mcqTotal: 20, createdAt: day(2026, 10, 30), ...over });

test('attemptsPerDay buckets the last N days oldest-first', () => {
  const rows = attemptsPerDay([A({}), A({ createdAt: day(2026, 10, 29) }), A({ createdAt: day(2026, 10, 1) })], 3, day(2026, 10, 30));
  expect(rows).toEqual([
    { day: '2026-10-28', count: 0 },
    { day: '2026-10-29', count: 1 },
    { day: '2026-10-30', count: 1 },
  ]);
});

test('statsBySubject averages MCQ percent per code', () => {
  const rows = statsBySubject([A({}), A({ mcqScore: 10 }), A({ paperCode: 'PHY101', mcqScore: 20 })]);
  expect(rows.find((r) => r.code === 'ACC501')).toEqual({ code: 'ACC501', attempts: 2, avgPct: 65 });
  expect(rows.find((r) => r.code === 'PHY101')).toEqual({ code: 'PHY101', attempts: 1, avgPct: 100 });
});

test('scoreDistribution bands MCQ percent', () => {
  const rows = scoreDistribution([A({ mcqScore: 5 }), A({ mcqScore: 10 }), A({ mcqScore: 15 }), A({ mcqScore: 20 }), A({ mcqTotal: 0 })]);
  expect(rows.map((r) => r.count)).toEqual([1, 1, 1, 1]);
});

test('groupStudents groups by VU ID with average and last attempt', () => {
  const rows = groupStudents([A({}), A({ createdAt: day(2026, 10, 28) }), A({ studentVuId: 'BC2', studentName: 'Zara' })]);
  expect(rows).toHaveLength(2);
  const asad = rows.find((r) => r.vuId === 'BC1');
  expect(asad.count).toBe(2);
  expect(asad.avgPct).toBe(80);
  expect(asad.lastAttempt).toEqual(day(2026, 10, 30));
});

test('attemptDate handles Timestamp-like, seconds, ISO and null', () => {
  expect(attemptDate({ createdAt: { toDate: () => day(2026, 1, 2) } })).toEqual(day(2026, 1, 2));
  expect(attemptDate({ createdAt: { seconds: 1761800000 } })).toEqual(new Date(1761800000 * 1000));
  expect(attemptDate({ createdAt: '2026-10-30T12:00:00.000Z' })).toEqual(new Date('2026-10-30T12:00:00.000Z'));
  expect(attemptDate({})).toBeNull();
  expect(attemptPct({ mcqScore: 7, mcqTotal: 20 })).toBe(35);
  expect(attemptPct({ mcqScore: 7, mcqTotal: 0 })).toBeNull();
});

test('mergeManualStudents never duplicates and adds 0-attempt students', () => {
  const derived = groupStudents([A({}), A({ createdAt: day(2026, 10, 28) })]);
  const merged = mergeManualStudents(derived, [
    { id: 'm1', vuId: 'BC1', name: 'Asad', note: 'assigned' },
    { id: 'm2', vuId: 'BC2', name: 'New Student', note: '' },
  ]);
  expect(merged).toHaveLength(2);
  expect(merged[0].manualId).toBe('m1');
  expect(merged[0].manualNote).toBe('assigned');
  expect(merged[1]).toMatchObject({ vuId: 'BC2', name: 'New Student', count: 0, manual: true, manualId: 'm2' });
});
