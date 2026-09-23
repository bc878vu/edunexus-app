import { answerKeyStats, attemptMessage, buildPracticeAttempt, canAdvance, isVerifiedAnswer, orderedQuestions, practiceStats, progressKey, recordAnswer, restoreAttemptIds, sanitizeProgress } from './examPractice';

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
  const verified = make('verified','[EduNexus Quiz|order:0001] Original solved source [EduNexus admin verified] Admin review source: CS620 official handout page 10');
  const guessed = make('guess','[EduNexus Quiz|order:0002] PROVISIONAL ANSWER: uploaded PDF has no answer key.');
  const conflicted = make('conflict','[EduNexus Quiz|order:0003] The conflict requires confirmation.');
  expect(isVerifiedAnswer(make('unsupported', 'Looks like the right answer'))).toBe(false);
  expect(isVerifiedAnswer(make('unsupported2', '[EduNexus admin verified]'))).toBe(false);
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
  const a=make('a','[EduNexus admin verified] Admin review source: official handout page 12');const b={...make('b','[EduNexus admin verified] Admin review source: official lecture 05 slide 14'),answer:0};
  expect(practiceStats([a,b],{b:0})).toMatchObject({answered:1,checked:1,score:1,unattempted:1});
});

test('student chooses 3 random questions from the same category with no repeated document or question wording', () => {
  const source = [
    make('a','Note'),make('b','Note'),make('c','Note'),make('d','Note'),
    make('e','Note'),make('a','Note'),
    {...make('same','Note'),question:'QUESTION A'}
  ];
  const ids = buildPracticeAttempt(source,3,'random',() => 0);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
  expect(ids).not.toContain('same');
  expect(source.filter(q=>ids.includes(q.id)).every(q=>q.subject==='CS620')).toBe(true);
  expect(buildPracticeAttempt(source,3,'sequence')).toEqual(['a','b','c']);
});
test('random and sequence attempts remove duplicate question wording even when spacing, case or punctuation differ', () => {
  const source = [
    {...make('a','Key'),question:'What is PMS?'},
    {...make('b','Key'),question:'  what   is   PMS ? '},
    {...make('c','Key'),question:'Goal theory focuses on goals.'},
    {...make('d','Key'),question:'Reward systems motivate employees.'}
  ];
  expect(buildPracticeAttempt(source,'all','sequence')).toEqual(['a','c','d']);
  const randomIds=buildPracticeAttempt(source,'all','random',()=>0.4);
  expect(randomIds).toHaveLength(3);
  expect(new Set(randomIds).size).toBe(3);
});

test('restoring a random saved attempt preserves exactly the same IDs, order and previous answers', () => {
  const source=['a','b','c','d','e'].map(id=>make(id,'Original uploaded answer'));
  const initial=buildPracticeAttempt(source,3,'random',()=>0);
  const record={attemptIds:initial,attemptMode:'random',attemptLimit:3,answers:{[initial[0]]:3},currentId:initial[1],finished:false};
  expect(restoreAttemptIds(record,source)).toEqual(initial);
  expect(sanitizeProgress(record,initial.map(id=>source.find(q=>q.id===id))))
    .toMatchObject({answers:{[initial[0]]:3},currentId:initial[1],finished:false});
});
test('legacy progress keeps deterministic source order and its stored answer selections',()=>{
  const src=['a','b','c'].map(id=>make(id,'Some answer'));
  expect(restoreAttemptIds({answers:{a:3}},src)).toEqual(['a','b','c']);
  expect(sanitizeProgress({answers:{a:3}},src).answers).toEqual({a:3});
});
test('practice score follows stored source keys without falsely claiming independent verification',()=>{
  const source=[make('a','Uploaded answer'),make('b','Uploaded answer'),make('c','Uploaded answer')];
  expect(answerKeyStats(source,{a:3,b:0})).toMatchObject({score:1,answered:2,total:3,unanswered:1,sourceUnreviewed:2});
  expect(attemptMessage(2,2)).toMatch(/Congratulations/);
  expect(attemptMessage(0,2)).toMatch(/Keep practicing/);
  expect(attemptMessage(0,0)).toMatch(/Start with/);
});

test('Next is locked until the current question has an answer and stays locked at the last question', () => {
  const questions = ['a','b','c'].map(id => make(id,'Uploaded key'));
  expect(canAdvance(questions, {}, 0)).toBe(false);
  expect(canAdvance(questions, {a:0}, 0)).toBe(true);
  expect(canAdvance(questions, {a:0}, 1)).toBe(false);
  expect(canAdvance(questions, {a:0,b:2}, 1)).toBe(true);
  expect(canAdvance(questions, {a:0,b:2,c:3}, 2)).toBe(false);
  expect(canAdvance(questions, {a:0}, -1)).toBe(false);
});

test('answer remains immutable on repeat taps and after navigating back to the same question', () => {
  const initial = {};
  const first = recordAnswer(initial, 'a', 0);
  expect(first).toEqual({a:0});
  expect(initial).toEqual({});
  expect(recordAnswer(first, 'a', 2)).toBe(first);
  expect(recordAnswer(first, 'a', 0)).toBe(first);
  expect(recordAnswer(first, 'b', -1)).toBe(first);
  const second = recordAnswer(first, 'b', 2);
  expect(second).toEqual({a:0,b:2});
  const restored = sanitizeProgress({answers:second,currentId:'a'},['a','b'].map(id=>make(id,'Uploaded key')));
  expect(restored.answers.a).toBe(0);
  expect(recordAnswer(restored.answers, 'a', 3)).toBe(restored.answers);
  expect(canAdvance(['a','b'].map(id=>make(id,'Uploaded key')), restored.answers, 0)).toBe(true);
  expect(recordAnswer({}, 'a', 3)).toEqual({a:3}); // New attempt can answer afresh.
});

test('completion messages consider how much of the selected attempt was answered', () => {
  expect(attemptMessage(1,1,20)).toMatch(/finished early/);
  expect(attemptMessage(18,20,20)).toMatch(/Congratulations/);
  expect(attemptMessage(9,20,20)).toMatch(/revision/);
  expect(attemptMessage(0,0,20)).toMatch(/Try again/);
});
