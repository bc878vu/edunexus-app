import { assemblePublicKnowledge, EDUNEXUS_GROUP, makeEduBotPrompt, SITE_GUIDE } from './edubotKnowledge';

test('website navigation and public WhatsApp invitation are included, but private WhatsApp content is not claimed', () => {
  const knowledge = assemblePublicKnowledge([], 'WhatsApp group ka link aur Exam Prep kahan hai?', 'Exam Prep');
  expect(knowledge).toContain('/?page=exam-prep');
  expect(knowledge).toContain('/?page=academic');
  expect(knowledge).toContain(EDUNEXUS_GROUP);
  expect(knowledge).toContain('CANNOT read group chat messages');
  expect(SITE_GUIDE.some(item => item.name === 'CGPA Calculator')).toBe(true);
});
test('only a small bounded public snapshot is included and storage token query strings are never exposed', () => {
  const docs = [
    { section:'files', data:{
      title:'CS620 Midterm Notes', subject:'CS620',
      url:'https://edunexus-app.vercel.app/file.pdf?token=SENSITIVE-BEARER-TOKEN'
    }},
    { section:'files', data:{
      title:'External phishing URL', url:'https://evil.example/collect?access_token=SENSITIVE'
    }},
    { section:'articles', data:{title:'Study Plan',description:'Learn time management'} }
  ];
  const knowledge=assemblePublicKnowledge(docs,'CS620 notes','Exam Prep');
  expect(knowledge).toContain('CS620 Midterm Notes');
  expect(knowledge).not.toContain('SENSITIVE');
  expect(knowledge).not.toContain('evil.example');
  expect(knowledge.length).toBeLessThanOrEqual(8600);
});
test('Roman Urdu, multilingual responses, missing-data honesty and prompt-injection caution are explicitly requested', () => {
  const knowledge=assemblePublicKnowledge([],'CS101 ka quiz kahan hai?','home');
  const prompt=makeEduBotPrompt('CS101 ka quiz kahan hai?',[
    {role:'user',text:'Roman Urdu me samjhao'},
    {role:'ai',text:'Exam Prep open karein.'}
  ],knowledge);
  expect(prompt).toContain('Roman Urdu');
  expect(prompt).toContain('UNTRUSTED DATA');
  expect(prompt).toContain('no access to group conversations');
  expect(prompt.length).toBeLessThanOrEqual(11300);
});
