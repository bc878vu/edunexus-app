// src/db/paperAttempts.js — student test-paper attempts (Firestore).
//
// Why Firestore and not Supabase here: on this site the admin identity that
// can read every student's attempt is the Firebase account
// (veducator4@gmail.com, enforced by the deployed Firestore rules). Supabase
// has no equivalent admin session on this site, so an admin list/read through
// Supabase cannot be authorized. Students sign in anonymously with Firebase
// (silent, no UI) at submit time; the rules allow a signed-in student to
// create only their own attempt (userId == uid) and read only their own doc,
// while the admin may list all and update (teacher marks).
//
// Collection path follows the site-wide ROOT:
//   artifacts/edunexus-live/public/data/paperAttempts
// The matching rules block must be published in the Firebase console before
// student submits or the admin list can work (see firestore.rules).

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase-client.js';
import { ROOT } from './_common.js';

const attemptsCol = () => collection(db, ...ROOT, 'paperAttempts');
const attemptRef = (id) => doc(db, ...ROOT, 'paperAttempts', id);

/** Submit a finished paper. Returns the new attempt id. */
export async function submitPaperAttempt(payload) {
  const ref = await addDoc(attemptsCol(), {
    ...payload,
    status: 'submitted',
    teacherMarks: null,
    teacherFeedback: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Admin only (rules): newest attempts first. */
export async function listPaperAttempts(max = 200) {
  const snap = await getDocs(query(attemptsCol(), orderBy('createdAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Owner or admin (rules). Returns null when missing. */
export async function getPaperAttempt(id) {
  if (!id) return null;
  const snap = await getDoc(attemptRef(id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Admin only (rules): save teacher marks + feedback, mark reviewed. */
export async function reviewPaperAttempt(id, { teacherMarks, teacherFeedback }) {
  await updateDoc(attemptRef(id), {
    teacherMarks: teacherMarks || null,
    teacherFeedback: teacherFeedback || '',
    status: 'reviewed',
    updatedAt: serverTimestamp(),
  });
}
