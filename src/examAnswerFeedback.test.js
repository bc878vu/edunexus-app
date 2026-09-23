import { explanationForStudent, explanationPrompt, plainFeedback } from './examAnswerFeedback';

const question = { subject:'CS620',term:'midterm',question:'An instantaneous change in system state is called?',
  options:['Moment','Occasion','Event','State'],answer:2,
  explanation:'[EduNexus Quiz|set:QUIZ-1|order:0002] An event changes system state. [EduNexus admin verified] Admin review source: CS620 handout lecture 03 page 8' };
test('stored educational explanation excludes admin control tags and reference markers',()=>{
  expect(explanationForStudent(question)).toBe('An event changes system state.');
});
test('incorrect selection receives a concise question-specific two-sided teaching prompt but cannot alter the answer key',()=>{
  const prompt=explanationPrompt(question,0);
  expect(prompt).toContain('administrator-approved answer in this question bank is C');
  expect(prompt).toContain('The student selected A');
  expect(prompt).toContain('Why your choice is wrong:');
  expect(prompt).toContain('Why the correct answer fits:');
  expect(prompt).toContain('An instantaneous change in system state');
});
test('provisional keys are never supplied as trusted correct choices to AI',()=>{
  const prompt=explanationPrompt({...question,explanation:'[EduNexus Quiz|set:QUIZ-1|order:0002] Solved Quiz 1 (source not verified)'},0);
  expect(prompt).toContain('NO verified answer');
  expect(prompt).not.toContain('administrator-approved answer');
  expect(prompt).toContain('without claiming ANY specific option is correct');
  expect(plainFeedback('**Wrong:** option A\n**Correct:** option C')).toBe('Wrong: option A\nCorrect: option C');
});
