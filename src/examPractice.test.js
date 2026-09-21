import { isVerifiedAnswer, orderedQuestions, practiceStats, progressKey, sanitizeProgress } from './examPractice';

const make = (id, explanation, timestamp = 1) => ({
  id, subject:'CS620',term:'midterm',question:'Question ' + id,
  options:['A','B','C','D'], answer:3, explanation,
  createdAt:{toMillis:()=>timestamp}
});
test('quiz follows original imported order, even when Firestore returns shuffled documents', () => {
  const items = [
    make('third','[EduNexus Quiz|order:0003] Solved question', 1),
    make('first','[EduNexus Quiz|order:0001] Solved question', 3),
    make('second','[EduNexus Quiz|order:0002] Solved question', 2),
    make('midterm','Real midterm lecture question', 4)
  ];
  expect(orderedQuestions(items,'quiz').map(item => item.id)).toEqual(['first','second','third']);
  expect(orderedQuestions(items,'midterm').map(item => item.id)).toEqual(['midterm']);
});
test('an unverified source answer is never marked correct nor counted as a verified score', () => {
  const verified = make('verified','[EduNexus Quiz|order:0001] Original solved source');
  const guessed = make('guess','[EduNexus Quiz|order:0002] PROVISIONAL ANSWER: uploaded PDF has no answer key.');
  const conflicted = make('conflict','[EduNexus Quiz|order:0003] The conflict requires confirmation.');
  expect(isVerifiedAnswer(guessed)).toBe(false);
  expect(isVerifiedAnswer(conflicted)).toBe(false);
  expect(practiceStats([verified,guessed,conflicted],{verified:3,guess:3,conflict:1}))
    .toMatchObject({answered:3,score:1,checked:1,provisional:2,unattempted:0});
  expect(isVerifiedAnswer({...guessed,explanation:guessed.explanation + ' [EduNexus admin verified] Admin review source: handout page 10'})).toBe(true);
});
test('saved answers are isolated by user, subject and term, and unknown question IDs are dropped', () => {
  expect(progressKey('CS620','quiz','student1')).not.toBe(progressKey('CS620','quiz','student2'));
  expect(progressKey('CS620','quiz','student1')).not.toBe(progressKey('CS620','midterm','student1'));
  expect(progressKey('CS620','quiz','student1')).not.toBe(progressKey('CS101','quiz','student1'));
  const record={answers:{first:3,removed:0,invalid:null},currentId:'removed',finished:true};
  expect(sanitizeProgress(record,[make('first','Solved'),make('invalid','Solved')]))
    .toEqual({answers:{first:3},currentId:'first',finished:true});
});
test('unanswered questions do not inflate the score, and answer 0 remains a valid selection', () => {
  const a=make('a','Confirmed source');const b={...make('b','Confirmed source'),answer:0};
  expect(practiceStats([a,b],{b:0})).toMatchObject({answered:1,checked:1,score:1,unattempted:1});
});
