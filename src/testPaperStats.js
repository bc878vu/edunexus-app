// src/testPaperStats.js — Pure aggregation for the test-paper admin dashboard.
//
// Input: paperAttempts rows (studentName, studentVuId, userId, paperCode,
// mcqScore, mcqTotal, createdAt). Firestore Timestamps, ISO strings and
// millis are all accepted for createdAt; rows without a usable date are
// counted in totals but not in the per-day chart. Nothing here touches the
// network, so it is unit-testable.

export function attemptDate(a) {
  const c = a && a.createdAt;
  if (!c) return null;
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? null : c;
  if (typeof c.toDate === 'function') {
    try {
      return c.toDate();
    } catch (_) {
      return null;
    }
  }
  if (typeof c === 'number') return new Date(c);
  if (typeof c === 'string') {
    const d = new Date(c);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof c.seconds === 'number') return new Date(c.seconds * 1000);
  return null;
}

export function attemptPct(a) {
  if (!a || !a.mcqTotal) return null;
  return Math.round((Number(a.mcqScore || 0) / Number(a.mcqTotal)) * 100);
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Attempts per day for the last `days` days (oldest first). */
export function attemptsPerDay(attempts, days = 14, now = new Date()) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.set(dayKey(d), { day: dayKey(d), count: 0 });
  }
  attempts.forEach((a) => {
    const d = attemptDate(a);
    if (!d) return;
    const b = buckets.get(dayKey(d));
    if (b) b.count += 1;
  });
  return [...buckets.values()];
}

/** Merge admin-added manual students into the attempt-derived list.
 * A manual entry whose VU ID already has attempts only attaches its note
 * (never a duplicate row); a manual entry with no attempts appears as a
 * 0-attempt student so it can be assigned papers and edited/deleted. */
export function mergeManualStudents(students, manual) {
  const byVu = new Map(students.map((s) => [String(s.vuId).toUpperCase(), s]));
  const out = [...students];
  (manual || []).forEach((m) => {
    const key = String(m.vuId || '').toUpperCase();
    if (!key) return;
    const existing = byVu.get(key);
    if (existing) {
      existing.manualId = m.id;
      existing.manualNote = m.note || '';
      existing.manual = true;
      return;
    }
    const row = {
      key: `manual:${key}`,
      vuId: m.vuId,
      name: m.name || 'Unnamed',
      attempts: [],
      count: 0,
      avgPct: null,
      lastAttempt: null,
      manual: true,
      manualId: m.id,
      manualNote: m.note || '',
    };
    byVu.set(key, row);
    out.push(row);
  });
  return out;
}
/** Attempts + average MCQ % grouped by subject code. */
export function statsBySubject(attempts) {
  const map = new Map();
  attempts.forEach((a) => {
    const code = a.paperCode || a.paperSlug || 'Unknown';
    const row = map.get(code) || { code, attempts: 0, pctSum: 0, pctCount: 0 };
    row.attempts += 1;
    const p = attemptPct(a);
    if (p !== null) {
      row.pctSum += p;
      row.pctCount += 1;
    }
    map.set(code, row);
  });
  return [...map.values()]
    .map((r) => ({ code: r.code, attempts: r.attempts, avgPct: r.pctCount ? Math.round(r.pctSum / r.pctCount) : null }))
    .sort((a, b) => b.attempts - a.attempts);
}

/** Score distribution across 4 bands (MCQ % only). */
export function scoreDistribution(attempts) {
  const bands = [
    { label: '0–25%', count: 0 },
    { label: '26–50%', count: 0 },
    { label: '51–75%', count: 0 },
    { label: '76–100%', count: 0 },
  ];
  attempts.forEach((a) => {
    const p = attemptPct(a);
    if (p === null) return;
    if (p <= 25) bands[0].count += 1;
    else if (p <= 50) bands[1].count += 1;
    else if (p <= 75) bands[2].count += 1;
    else bands[3].count += 1;
  });
  return bands;
}

/** Group attempts into students (VU ID preferred, Firebase UID fallback). */
export function groupStudents(attempts) {
  const map = new Map();
  attempts.forEach((a) => {
    const key = a.studentVuId || a.userId || 'unknown';
    const row = map.get(key) || {
      key,
      vuId: a.studentVuId || '—',
      name: a.studentName || 'Unnamed',
      attempts: [],
    };
    if (a.studentName && row.name === 'Unnamed') row.name = a.studentName;
    row.attempts.push(a);
    map.set(key, row);
  });
  return [...map.values()].map((s) => {
    const pcts = s.attempts.map(attemptPct).filter((p) => p !== null);
    const last = s.attempts
      .map((a) => attemptDate(a))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    return {
      ...s,
      count: s.attempts.length,
      avgPct: pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null,
      lastAttempt: last || null,
    };
  }).sort((a, b) => b.count - a.count);
}
