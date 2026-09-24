import test, { after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getMetadata, deleteObject } from 'firebase/storage';

// Run ONLY against the Firebase Storage emulator. Never point this test at production.
const PROJECT = 'demo-edunexus-storage';
const BUCKET = 'gs://' + PROJECT + '.firebasestorage.app';
const MiB = 1024 * 1024;
const environment = await initializeTestEnvironment({
  projectId: PROJECT,
  storage: {
    host: '127.0.0.1',
    port: 9199,
    rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8')
  }
});
after(async () => environment.cleanup());

const student = environment.authenticatedContext('student_one', {
  email: 'student@example.test',
  email_verified: true
});
const otherStudent = environment.authenticatedContext('student_two', {
  email: 'other@example.test',
  email_verified: true
});
const admin = environment.authenticatedContext('admin_uid', {
  email: 'veducator4@gmail.com',
  email_verified: true
});
const unverifiedAdmin = environment.authenticatedContext('admin_unverified', {
  email: 'veducator4@gmail.com',
  email_verified: false
});
const guest = environment.unauthenticatedContext();
const target = (context, path) => ref(context.storage(BUCKET), path);
const upload = (context, path, bytes, contentType) =>
  uploadBytes(target(context, path), new Uint8Array(bytes), { contentType });
const examPath = (user = 'student_one', uploadId = 'abcdefgh_12345678', name = 'paper.pdf') =>
  'exam-papers/' + user + '/' + uploadId + '/' + name;

test('student can publish a valid exam PDF; public can read it; student cannot overwrite', async () => {
  const path = examPath();
  await assertSucceeds(upload(student, path, 1024, 'application/pdf'));
  await assertSucceeds(getMetadata(target(guest, path)));
  await assertFails(upload(student, path, 1024, 'application/pdf'));
  await assertFails(deleteObject(target(otherStudent, path)));
  await assertSucceeds(deleteObject(target(student, path)));
});

test('student cannot upload to another UID or upload while signed out', async () => {
  await assertFails(upload(student, examPath('student_two'), 42, 'application/pdf'));
  await assertFails(upload(guest, examPath('guest'), 42, 'application/pdf'));
});

test('student cannot bypass the intended upload ID or safe filename patterns', async () => {
  await assertFails(upload(student, examPath('student_one', 'bad', 'paper.pdf'), 42, 'application/pdf'));
  await assertFails(upload(student, examPath('student_one', 'INVALIDUPPER', 'paper.pdf'), 42, 'application/pdf'));
  await assertFails(upload(student, examPath('student_one', 'abcdefgh_12345678', 'paper name.pdf'), 42, 'application/pdf'));
});

test('student cannot publish empty, oversized or disallowed-MIME exam attachments', async () => {
  await assertFails(upload(student, examPath('student_one', 'abcdefgh_87654321', 'empty.pdf'), 0, 'application/pdf'));
  await assertFails(upload(student, examPath('student_one', 'abcdefgh_87654321', 'large.pdf'), 5 * MiB + 1, 'application/pdf'));
  await assertFails(upload(student, examPath('student_one', 'abcdefgh_87654321', 'script.exe'), 42, 'application/x-msdownload'));
  await assertSucceeds(upload(student, examPath('student_one', 'abcdefgh_87654321', 'image.png'), 42, 'image/png'));
  await assertSucceeds(upload(student, examPath('student_one', 'abcdefgh_87654321', 'image.jpg'), 42, 'image/jpeg'));
});

test('verified admin can upload and public can access tutorial video; others cannot write', async () => {
  const path = 'tutorials/intro.mp4';
  await assertSucceeds(upload(admin, path, 4096, 'video/mp4'));
  await assertSucceeds(getMetadata(target(guest, path)));
  await assertFails(upload(student, 'tutorials/unauthorised.mp4', 42, 'video/mp4'));
  await assertFails(upload(unverifiedAdmin, 'tutorials/unverified.mp4', 42, 'video/mp4'));
  await assertSucceeds(deleteObject(target(admin, path)));
});

test('academic-hub uploads remain verified-admin only and publicly readable', async () => {
  const path = 'academic-hub/admin_uid/abcdefgh_12345678/study.pdf';
  await assertSucceeds(upload(admin, path, 1000, 'application/pdf'));
  await assertSucceeds(getMetadata(target(guest, path)));
  await assertFails(upload(student, 'academic-hub/student_one/abcdefgh_12345678/study.pdf', 1000, 'application/pdf'));
  await assertFails(upload(unverifiedAdmin, 'academic-hub/admin_unverified/abcdefgh_12345678/study.pdf', 1000, 'application/pdf'));
});

test('legacy general path stays admin-writable, student-denied and public-readable', async () => {
  const path = 'legacy-resource.pdf';
  await assertSucceeds(upload(admin, path, 1024, 'application/pdf'));
  await assertSucceeds(getMetadata(target(guest, path)));
  await assertFails(upload(student, 'student-legacy.pdf', 1024, 'application/pdf'));
  await assertFails(upload(unverifiedAdmin, 'unverified-legacy.pdf', 1024, 'application/pdf'));
  await assertSucceeds(deleteObject(target(admin, path)));
});
