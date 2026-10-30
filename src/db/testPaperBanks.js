// src/db/testPaperBanks.js — Admin-uploaded test-paper banks, stored in Firestore.
//
// Why Firestore and not Supabase here: the admin identity on this site is the
// Firebase account (veducator4@gmail.com, enforced by the deployed Firestore
// rules), and students browse sign-in-free. The banks live as docs in the
// already-published `meta` collection (public read; admin-only create/update/
// delete), so NO new rules and NO user-run SQL are needed. One doc per
// subject+term: id `testPaperBank_<CODE>_<term>`, field kind='testPaperBank'.
// The student builder merges these over the code banks (see
// testPaperBankMerge.js); a failed read falls back to code banks only.

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase-client.js';
import { ROOT } from './_common.js';
import { validateTestPaperBank } from '../testPaperBankValidate.js';

const KIND = 'testPaperBank';

const banksCol = () => collection(db, ...ROOT, 'meta');
const bankRef = (code, term) => doc(db, ...ROOT, 'meta', `${KIND}_${code}_${String(term).toLowerCase()}`);

function stripMetaFields(data) {
  const { kind, updatedAt, ...bank } = data;
  return bank;
}

/** All admin-uploaded banks, newest first. Throws on read failure (callers decide the fallback). */
export async function listAdminBanks() {
  const snap = await getDocs(query(banksCol(), where('kind', '==', KIND)));
  return snap.docs.map((d) => ({ id: d.id, ...stripMetaFields(d.data()) }));
}

/**
 * Validate + save a bank (object in the testPapersBank.js shape, or a JSON
 * string of one). Returns the saved bank with counts. Throws with the
 * validation reasons when the bank is invalid — nothing invalid is stored.
 */
export async function saveAdminBank(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (_) {
      throw new Error('Bank file is not valid JSON');
    }
  }
  const result = validateTestPaperBank(parsed);
  if (!result.valid) {
    throw new Error('Bank failed validation:\n' + result.errors.join('\n'));
  }
  const { bank, counts } = result;
  await setDoc(bankRef(bank.code, bank.term), {
    kind: KIND,
    ...bank,
    updatedAt: serverTimestamp(),
  });
  return { ...bank, counts };
}

/** Delete one admin-uploaded bank. Code banks are untouched (they live in code). */
export async function deleteAdminBank(code, term) {
  await deleteDoc(bankRef(code, term));
}
