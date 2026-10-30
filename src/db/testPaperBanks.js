// src/db/testPaperBanks.js — Admin-uploaded test-paper banks, stored in Supabase.
//
// User decision 2026-10-30: NO Firestore for the new test-paper admin
// features — Supabase only. (The earlier Firestore meta version failed live
// with "Missing or insufficient permissions" because the live console rules
// lacked the meta admin-write rule; Supabase follows the site's proven
// exam_mcqs pattern instead: anon-friendly policies, admin gating at the
// UI level in the admin panel.)
//
// Table `test_paper_banks` (one row per code+term; created by the SQL file
// ~/workspace/testpapers/supabase-testpaper-admin.sql, run by the user in
// the EduNexus Supabase SQL editor):
//   code, term, title, scope, lectures jsonb, mcqs jsonb, shorts jsonb,
//   longs jsonb, updated_at.
// The student builder merges these over the code banks (see
// testPaperBankMerge.js); a failed read falls back to code banks only.

import { supabase } from './_common.js';
import { validateTestPaperBank } from '../testPaperBankValidate.js';

const TABLE = 'test_paper_banks';

/** Row (Supabase) -> bank (code shape). Pure, unit-tested. */
export function mapBankRow(row) {
  return {
    code: row.code,
    title: row.title,
    term: row.term,
    scope: row.scope || '',
    lectures: Array.isArray(row.lectures) ? row.lectures : [],
    mcqs: Array.isArray(row.mcqs) ? row.mcqs : [],
    shorts: Array.isArray(row.shorts) ? row.shorts : [],
    longs: Array.isArray(row.longs) ? row.longs : [],
  };
}

/** All admin-uploaded banks. Throws on read failure (callers decide the fallback). */
export async function listAdminBanks() {
  const { data, error } = await supabase.from(TABLE).select('*');
  if (error) throw error;
  return (data || []).map(mapBankRow);
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
  const row = {
    code: bank.code,
    term: bank.term,
    title: bank.title,
    scope: bank.scope,
    lectures: bank.lectures,
    mcqs: bank.mcqs,
    shorts: bank.shorts,
    longs: bank.longs,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'code,term' });
  if (error) throw error;
  return { ...bank, counts };
}

/** Delete one admin-uploaded bank. Code banks are untouched (they live in code). */
export async function deleteAdminBank(code, term) {
  const { error } = await supabase.from(TABLE).delete().eq('code', code).eq('term', term);
  if (error) throw error;
}
