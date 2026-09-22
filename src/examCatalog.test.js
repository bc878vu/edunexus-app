import { EXAM_CATEGORIES, firstAvailableExam, publishedExamCatalog } from './examCatalog';

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
