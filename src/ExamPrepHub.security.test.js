import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ExamPrepHub from './ExamPrepHub';
import { ADMIN_TAB_KEY, ADMIN_EMAIL, clearAdminTab, grantAdminTab } from './adminSession';

jest.mock('./firebase-client', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: (_reference, notify) => { notify({ docs: [] }); return () => {}; },
  limit: jest.fn(),
  query: jest.fn(() => ({})),
  where: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  writeBatch: jest.fn()
}));
jest.mock('./ExamMcqPractice', () => () => <div>Public exam practice</div>);
jest.mock('./ExamPaperCommunity', () => () => <div>Student paper reviews</div>);
jest.mock('./McqBulkImporter', () => () => <div>Secure MCQ uploader</div>);
jest.mock('./ExamMcqAdminManager', () => () => <div>Verified admin question manager</div>);
jest.mock('./ExamPaperReviewManager', () => () => <div>Admin paper review manager</div>);

const admin = { uid: 'valid-uid', email: ADMIN_EMAIL, emailVerified: true, isAnonymous: false };
beforeEach(() => {
  clearAdminTab();
  window.history.replaceState({}, '', '/?page=exam-prep');
});
afterEach(() => { cleanup(); clearAdminTab(); });

test('PUBLIC Exam Prep never renders Admin tools, even with a previously authenticated administrator', async () => {
  // Reproduces the screenshot regression: an old Firebase admin user is still
  // present, but this is not the active restricted Admin Panel.
  window.sessionStorage.setItem(ADMIN_TAB_KEY, admin.uid);
  render(<ExamPrepHub user={admin} initialTab="admin" />);
  expect(screen.queryByRole('button', { name: 'Admin tools' })).toBeNull();
  expect(screen.queryByText('Exam content management')).toBeNull();
  expect(screen.queryByRole('button', { name: /Admin Panel/i })).toBeNull();
  await waitFor(() => expect(screen.getByText('Public exam practice')).toBeTruthy());
});

test('PUBLIC Exam Prep still hides management if the URL is manually changed to /?page=admin', () => {
  window.history.replaceState({}, '', '/?page=admin');
  grantAdminTab(admin);
  render(<ExamPrepHub user={admin} initialTab="admin" />);
  expect(screen.queryByRole('button', { name: 'Admin tools' })).toBeNull();
  expect(screen.queryByText('Exam content management')).toBeNull();
  expect(screen.queryByRole('button', { name: /Admin Panel/i })).toBeNull();
});

test('admin workspace requires explicit panel context and a verified active admin session', () => {
  window.history.replaceState({}, '', '/?page=admin');
  render(<ExamPrepHub user={admin} initialTab="admin" adminWorkspace />);
  expect(screen.queryByRole('button', { name: 'Admin tools' })).toBeNull();
  cleanup();

  grantAdminTab(admin);
  render(<ExamPrepHub user={admin} initialTab="admin" adminWorkspace />);
  expect(screen.getByRole('button', { name: 'Admin tools' })).toBeTruthy();
  expect(screen.getByText('Exam content management')).toBeTruthy();
});

test('logout clears privileges even if the same admin user object is passed again after refresh', () => {
  window.history.replaceState({}, '', '/?page=admin');
  grantAdminTab(admin);
  const view = render(<ExamPrepHub user={admin} initialTab="admin" adminWorkspace />);
  expect(screen.getByText('Exam content management')).toBeTruthy();
  clearAdminTab();
  view.rerender(<ExamPrepHub user={admin} initialTab="admin" adminWorkspace />);
  expect(screen.queryByText('Exam content management')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Admin tools' })).toBeNull();
});

test('Each public view has its own layout and the MCQ catalogue is shown only on MCQ Bank', async () => {
  render(<ExamPrepHub user={null}/>);
  await waitFor(() => expect(screen.getByText('Public exam practice')).toBeTruthy());
  expect(screen.getByRole('region', { name: 'Published quiz and exam categories' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Paper Reviews' }));
  await waitFor(() => expect(screen.getByText('Student paper reviews')).toBeTruthy());
  expect(screen.queryByRole('region', { name: 'Published quiz and exam categories' })).toBeNull();
  expect(screen.queryByText('Practice smarter. Prepare with confidence.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Study Files' }));
  await waitFor(() => expect(screen.getByText('Find the material you need.')).toBeTruthy());
  expect(screen.queryByRole('region', { name: 'Published quiz and exam categories' })).toBeNull();
  expect(screen.queryByText('Student paper reviews')).toBeNull();
});
