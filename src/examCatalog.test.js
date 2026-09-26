import { EXAM_CATEGORIES, catalogFromCounts, firstAvailableExam, publishedExamCatalog } from './examCatalog';

const make = (subject, term, explanation = '') => ({ subject, term, explanation,
  question:'Original question', options:['A','B','C','D'], answer:0 });
test('published categories use the physical Quiz marker, not the legacy midterm storage field', () => {
  const docs = [
    make('CS620','midterm','[EduNexus Quiz|order:0001] Quiz 1'),
    make('CS620','midterm','[EduNexus Quiz|order:0002] Quiz 1'),
    make('CS620','midterm','Official midterm paper'),
    make('CS101','finalterm','Lecture handout'),
    { subject:'CS101',term:'finalterm',question:'',options:[] }
  ].map(data => ({ data:() => data }));
  const catalog = publishedExamCatalog(docs);
  expect(catalog.bySubject.CS620).toEqual({quiz:2,midterm:1,finalterm:0});
  expect(catalog.bySubject.CS101.finalterm).toBe(1);
  expect(catalog.subjects).toEqual(['CS101','CS620']);
  expect(catalog.total).toBe(4);
});
test('first visit opens a published subject/category rather than an empty hardcoded CS101 Finalterm', () => {
  const catalog = publishedExamCatalog([make('CS620','midterm','[EduNexus Quiz|order:0001] Quiz 1')]);
  expect(firstAvailableExam(catalog,'CS101','finalterm')).toEqual({subject:'CS620',term:'quiz'});
  expect(firstAvailableExam(catalog,'CS620','finalterm')).toEqual({subject:'CS620',term:'quiz'});
  expect(firstAvailableExam(catalog,'CS620','quiz')).toEqual({subject:'CS620',term:'quiz'});
  expect(firstAvailableExam(publishedExamCatalog([]),'CS101','quiz')).toBeNull();
  expect(EXAM_CATEGORIES).toEqual(['quiz','midterm','finalterm']);
});
test('subject list accepts newly published courses absent from old static datalist', () => {
  const catalog = publishedExamCatalog([make('MCM301','finalterm'),make('PHY101','midterm')]);
  expect(catalog.subjects).toContain('MCM301');
  expect(catalog.bySubject.MCM301.finalterm).toBe(1);
});
test('catalogFromCounts rebuilds the catalogue shape from the denormalized counts document', () => {
  const data = { bySubject: {
    CS609: { quiz: 3, midterm: 400, finalterm: 127 },
    cs101: { quiz: 0, midterm: 0, finalterm: 5 },
    'NOT-A-COURSE': { quiz: 1, midterm: 1, finalterm: 1 },
    MGT611: { quiz: 0, midterm: 0, finalterm: 0 },
  }, updatedAt: { seconds: 1 } };
  const catalog = catalogFromCounts(data);
  expect(catalog.bySubject.CS609).toEqual({ quiz: 3, midterm: 400, finalterm: 127 });
  expect(catalog.bySubject.CS101).toEqual({ quiz: 0, midterm: 0, finalterm: 5 });
  expect(catalog.bySubject['NOT-A-COURSE']).toBeUndefined();
  expect(catalog.bySubject.MGT611).toBeUndefined();
  expect(catalog.subjects).toEqual(['CS101', 'CS609']);
  expect(catalog.total).toBe(535);
  expect(firstAvailableExam(catalog, 'CS101', 'quiz')).toEqual({ subject: 'CS101', term: 'finalterm' });
});
test('catalogFromCounts returns an empty catalogue for missing or malformed documents', () => {
  expect(catalogFromCounts(undefined)).toEqual({ subjects: [], bySubject: {}, total: 0 });
  expect(catalogFromCounts(null)).toEqual({ subjects: [], bySubject: {}, total: 0 });
  expect(catalogFromCounts({})).toEqual({ subjects: [], bySubject: {}, total: 0 });
  expect(catalogFromCounts({ bySubject: null })).toEqual({ subjects: [], bySubject: {}, total: 0 });
});
