// src/testPaperBankValidate.js — Pure validation for admin-uploaded test-paper banks.
//
// An admin-uploaded bank must match the proven testPapersBank.js shape exactly:
// code/title/term/lectures + mcqs/shorts/longs with lecture tags. Anything that
// fails validation is rejected with a list of reasons — never silently fixed,
// never padded. This module has no dependencies so the admin UI and any
// future importer can share it.

const CODE_RE = /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isInt(v) {
  return Number.isInteger(v);
}

function checkLectureTags(list, lectureNos, label, errors, seenIds) {
  list.forEach((q, i) => {
    const where = `${label}[${i}]`;
    if (!isNonEmptyString(q.id)) {
      errors.push(`${where}: missing id`);
    } else if (seenIds.has(q.id)) {
      errors.push(`${where}: duplicate id "${q.id}"`);
    } else {
      seenIds.add(q.id);
    }
    if (!isNonEmptyString(q.q)) errors.push(`${where}: missing question text`);
    if (!Array.isArray(q.lectures) || q.lectures.length === 0) {
      errors.push(`${where}: lectures must be a non-empty array`);
    } else {
      q.lectures.forEach((n) => {
        if (!isInt(n) || !lectureNos.has(n)) errors.push(`${where}: lecture tag ${n} is not a declared lecture`);
      });
    }
  });
}

export function validateTestPaperBank(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Bank must be a JSON object'], counts: null, bank: null };
  }
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(code)) errors.push(`code "${input.code}" is not a valid subject code (e.g. ACC501)`);
  if (!isNonEmptyString(input.title)) errors.push('title is required');
  // unitLabel: 'Lecture' by default; 'Topic' for topic-based courses (e.g. CS205, CS311).
  // Anything else is rejected — a bank must never silently render under the wrong unit word.
  let unitLabel = 'Lecture';
  if (input.unitLabel !== undefined) {
    if (input.unitLabel === 'Topic') unitLabel = 'Topic';
    else if (input.unitLabel !== 'Lecture') errors.push('unitLabel must be "Lecture" or "Topic"');
  }
  if (input.term !== 'Midterm' && input.term !== 'Finalterm') {
    errors.push('term must be "Midterm" or "Finalterm"');
  }
  if (!Array.isArray(input.lectures) || input.lectures.length === 0) {
    errors.push('lectures must be a non-empty array of {n, title}');
  }
  const lectureNos = new Set();
  (Array.isArray(input.lectures) ? input.lectures : []).forEach((l, i) => {
    if (!l || !isInt(l.n) || l.n < 1) errors.push(`lectures[${i}]: n must be a positive integer`);
    else if (lectureNos.has(l.n)) errors.push(`lectures[${i}]: duplicate lecture number ${l.n}`);
    else lectureNos.add(l.n);
    if (!l || !isNonEmptyString(l.title)) errors.push(`lectures[${i}]: title is required`);
  });

  const mcqs = Array.isArray(input.mcqs) ? input.mcqs : null;
  const shorts = Array.isArray(input.shorts) ? input.shorts : null;
  const longs = Array.isArray(input.longs) ? input.longs : null;
  if (mcqs === null) errors.push('mcqs must be an array');
  if (shorts === null) errors.push('shorts must be an array');
  if (longs === null) errors.push('longs must be an array');
  const total = (mcqs || []).length + (shorts || []).length + (longs || []).length;
  if (total === 0) errors.push('bank holds zero questions — nothing to upload');

  const seenIds = new Set();
  if (mcqs) {
    checkLectureTags(mcqs, lectureNos, 'mcqs', errors, seenIds);
    mcqs.forEach((q, i) => {
      const where = `mcqs[${i}]`;
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${where}: options must be exactly 4`);
      } else {
        const letters = ['A', 'B', 'C', 'D'];
        q.options.forEach((o, j) => {
          if (!o || o.letter !== letters[j]) errors.push(`${where}: options[${j}] must carry letter ${letters[j]}`);
          if (!o || !isNonEmptyString(o.text)) errors.push(`${where}: options[${j}] text must be non-empty`);
        });
      }
      if (!['A', 'B', 'C', 'D'].includes(q.answer)) errors.push(`${where}: answer must be one of A, B, C, D`);
      if (!isNonEmptyString(q.explanation)) errors.push(`${where}: explanation is required`);
    });
  }
  if (shorts) {
    checkLectureTags(shorts, lectureNos, 'shorts', errors, seenIds);
    shorts.forEach((q, i) => {
      if (!isNonEmptyString(q.modelAnswer)) errors.push(`shorts[${i}]: modelAnswer is required`);
    });
  }
  if (longs) {
    checkLectureTags(longs, lectureNos, 'longs', errors, seenIds);
    longs.forEach((q, i) => {
      if (!isNonEmptyString(q.modelAnswer)) errors.push(`longs[${i}]: modelAnswer is required`);
    });
  }

  if (errors.length > 0) return { valid: false, errors, counts: null, bank: null };

  const norm = (q) => ({
    ...q,
    concept: typeof q.concept === 'string' ? q.concept : '',
    repeated: q.repeated === true,
  });
  const bank = {
    code,
    title: input.title.trim(),
    term: input.term,
    unitLabel,
    scope: `${unitLabel}s ${Math.min(...lectureNos)}–${Math.max(...lectureNos)}`,
    lectures: input.lectures.map((l) => ({ n: l.n, title: l.title.trim() })),
    mcqs: mcqs.map(norm),
    shorts: shorts.map(norm),
    longs: longs.map(norm),
  };
  return {
    valid: true,
    errors: [],
    counts: { mcqs: bank.mcqs.length, shorts: bank.shorts.length, longs: bank.longs.length, lectures: bank.lectures.length },
    bank,
  };
}
