import { mapBankRow } from './testPaperBanks';
import { mapRecordRow } from './testPaperAdmin';

test('mapBankRow passes arrays through and defaults missing ones', () => {
  const row = {
    code: 'ACC501', term: 'Midterm', title: 'Business Finance', scope: 'Lectures 1–22',
    lectures: [{ n: 1, title: 'Introduction' }],
    mcqs: [{ id: 'Q001' }],
    shorts: [],
    longs: null,
  };
  expect(mapBankRow(row)).toEqual({
    code: 'ACC501', title: 'Business Finance', term: 'Midterm', scope: 'Lectures 1–22',
    lectures: [{ n: 1, title: 'Introduction' }],
    mcqs: [{ id: 'Q001' }],
    shorts: [],
    longs: [],
  });
});

test('mapRecordRow flattens data and keeps id + kind', () => {
  const row = {
    id: 'abc123', kind: 'savedPaper',
    data: { title: 'ACC501 Lec 1-9', code: 'ACC501', lectures: [1, 2], mcq: 20, short: 3, long: 3 },
  };
  expect(mapRecordRow(row)).toEqual({
    id: 'abc123', kind: 'savedPaper',
    title: 'ACC501 Lec 1-9', code: 'ACC501', lectures: [1, 2], mcq: 20, short: 3, long: 3,
  });
  expect(mapRecordRow({ id: 'x', kind: 'paperAssignment', data: null })).toEqual({ id: 'x', kind: 'paperAssignment' });
});
