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
  const liveCodes = new Set(subjects.map((s) => s.code));
  const merged = catalog.map((c) => (liveCodes.has(c.code) ? { ...c, status: 'live' } : c));
  const known = new Set(catalog.map((c) => c.code));
  subjects.forEach((s) => {
    if (!known.has(s.code)) merged.push({ code: s.code, status: 'live' });
  });
  return merged;
}
