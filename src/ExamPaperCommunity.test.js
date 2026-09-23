import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import path from 'path';
import ExamPaperCommunity from './ExamPaperCommunity';
import { onSnapshot } from 'firebase/firestore';

jest.mock('./firebase-client', () => ({ db:{}, storage:{} }));
jest.mock('firebase/storage', () => ({
  deleteObject:jest.fn(), getDownloadURL:jest.fn(), ref:jest.fn(), uploadBytes:jest.fn()
}));
jest.mock('firebase/firestore', () => ({
  collection:jest.fn((db,...segments)=>({name:segments[segments.length-1]})),
  doc:jest.fn((ref,id)=>({name:ref.name,id})),
  getDoc:jest.fn(()=>Promise.resolve({exists:()=>false})),
  limit:jest.fn(n=>({limit:n})),
  where:jest.fn((field,operator,value)=>({field,operator,value})),
  query:jest.fn((reference,...constraints)=>({...reference,constraints})),
  onSnapshot:jest.fn(),
  addDoc:jest.fn(),setDoc:jest.fn(),serverTimestamp:jest.fn(),Timestamp:{fromDate:jest.fn(v=>v)}
}));

const posted = (id, subject, term, summary) => ({
  id, subject,term,summary,sharedBy:'Student',examDate:'2026-09-22',
  difficulty:'moderate',createdAt:{toMillis:()=>Date.parse('2026-09-22')}
});
beforeEach(() => {
  onSnapshot.mockImplementation((source,notify) => {
    const records = source.name === 'examCommunityReviews'
      ? [posted('first','MGT611','finalterm','Previously shared MGT611 final exam review')]
      : source.name === 'examReviews'
        ? [posted('older','CS620','midterm','Previously published CS620 paper review')]
        : source.name === 'examReviewSubmissions'
          ? [{id:'pending',userId:'reader123',subject:'MGT611',term:'midterm',
            examDate:'2026-09-21',summary:'An older privately submitted paper review',status:'pending'}]
          : [];
    notify({docs:records.map(item=>({id:item.id,data:()=>item}))});
    return jest.fn();
  });
});
afterEach(()=>{cleanup();jest.clearAllMocks();});

test('old public reviews remain visible irrespective of MCQ subject/term selection', async () => {
  render(<ExamPaperCommunity user={null} subject="MGT611" term="midterm"/>);
  expect(await screen.findByText('Previously shared MGT611 final exam review')).toBeInTheDocument();
  expect(screen.getByText('Previously published CS620 paper review')).toBeInTheDocument();
  const controls = screen.getByRole('group',{name:'Find paper reviews'});
  fireEvent.click(within(controls).getByLabelText('Show reviews for all subjects'));
  expect(screen.getByText('Previously shared MGT611 final exam review')).toBeInTheDocument();
  expect(screen.queryByText('Previously published CS620 paper review')).not.toBeInTheDocument();
  fireEvent.change(within(controls).getByLabelText('Exam type'),{target:{value:'midterm'}});
  expect(screen.queryByText('Previously shared MGT611 final exam review')).not.toBeInTheDocument();
  fireEvent.click(within(controls).getByLabelText('Show reviews for all subjects'));
  expect(screen.getByText('Previously published CS620 paper review')).toBeInTheDocument();
});

test('a previous private submission is visible only to its signed-in author, and never public by default', async () => {
  const view = render(<ExamPaperCommunity user={{uid:'reader123'}} subject="MGT611" term="midterm"/>);
  expect(await screen.findByText('An older privately submitted paper review')).toBeInTheDocument();
  expect(screen.getByText('Awaiting publication')).toBeInTheDocument();
  const results = document.getElementById('edx-paper-feed');
  expect(within(results).queryByText('An older privately submitted paper review')).not.toBeInTheDocument();
  view.rerender(<ExamPaperCommunity user={null} subject="MGT611" term="midterm"/>);
  await waitFor(()=>expect(screen.queryByText('An older privately submitted paper review')).not.toBeInTheDocument());
});

test('a previous private submission can prefill a new review without publishing or auto-consenting', async () => {
  render(<ExamPaperCommunity user={{uid:'reader123'}} subject="MGT611" term="midterm"/>);
  await screen.findByText('An older privately submitted paper review');
  fireEvent.click(screen.getByRole('button',{name:'Use this text in a new review'}));
  expect(screen.getByLabelText('Your paper experience and study tips').value).toBe('An older privately submitted paper review');
  expect(screen.getByLabelText(/I have completed this exam/i)).not.toBeChecked();
});

test('Firestore allows student submissions without attachments and private lookup for prior drafts',()=>{
  const rules = readFileSync(path.join(process.cwd(),'firestore.rules'),'utf8');
  const start = rules.indexOf('match /artifacts/edunexus-live/public/data/examCommunityReviews/{reviewId}');
  const end = rules.indexOf('// Moderated reviews',start);
  const publicRules=rules.slice(start,end);
  const create=publicRules.slice(publicRules.indexOf('allow create:'),publicRules.indexOf('allow update:'));
  expect(create).toContain("'examAt', 'sharedBy', 'difficulty', 'topics', 'summary', 'createdAt'");
  expect(create).not.toMatch(/keys\(\)\.hasAll\(\[\s*'userId',[\s\S]*?'paperName'/);
  expect(create).toContain("!request.resource.data.keys().hasAny(['paperName', 'paperPath', 'paperUrl'])");
  const prior = rules.slice(rules.indexOf('match /artifacts/edunexus-live/public/data/examReviewSubmissions'),start);
  expect(prior).toContain("resource.data.userId == request.auth.uid");
});
