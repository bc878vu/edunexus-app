// src/testPaperBankMerge.js — Pure merge of code banks + admin-uploaded banks.
//
// Code banks (src/testPapersBank.js) are the fallback. An admin-uploaded bank
// for the same code+term REPLACES the code bank (so a correction uploaded
// from the admin panel takes effect without a code push); a bank for a new
// code is added. The student catalog merge marks every banked subject 'live'
// so it appears on the Test Papers list without a code change.

export function mergeBankSubjects(codeSubjects, adminBanks) {
  const byKey = new Map();
  codeSubjects.forEach((s) => byKey.set(`${s.code}::${s.term}`, s));
  (adminBanks || []).forEach((b) => {
    byKey.set(`${b.code}::${b.term}`, {
      code: b.code,
      title: b.title,
      term: b.term,
      unitLabel: b.unitLabel || 'Lecture',
      scope: b.scope,
      lectures: b.lectures,
      bank: { mcqs: b.mcqs, shorts: b.shorts, longs: b.longs },
      fromAdmin: true,
    });
  });
  return [...byKey.values()];
}

export function mergeCatalog(catalog, subjects) {
  // A code listed twice in the catalog (BT401 was, once 'live' and once
  // 'nodata') rendered two identical cards and inflated the section count.
  // First occurrence wins, so a later stale duplicate can never do that again.
  const seenCodes = new Set();
  const deduped = catalog.filter((c) => { if (seenCodes.has(c.code)) return false; seenCodes.add(c.code); return true; });
  const liveCodes = new Set(subjects.map((s) => s.code));
  const merged = deduped.map((c) => (liveCodes.has(c.code) ? { ...c, status: 'live' } : c));
  const known = new Set(deduped.map((c) => c.code));
  subjects.forEach((s) => {
    if (!known.has(s.code)) {
      // A subject with two banks (Midterm + Finalterm) must still get ONE
      // catalog entry — without adding the code here the loop pushed one
      // entry per bank, so the home page rendered the first term twice and
      // the second term was unreachable.
      known.add(s.code);
      merged.push({ code: s.code, status: 'live' });
    }
  });
  return merged;
}
