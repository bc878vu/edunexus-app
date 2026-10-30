// src/AdminTestUsers.jsx — Test-paper students: list + per-student progress.
//
// A "student" is grouped from attempts (VU ID preferred, anonymous Firebase
// UID fallback) — there is no separate user registry on this sign-in-free
// site. Teacher marking itself stays in the Paper Attempts tab; this tab is
// the progress view: attempts, scores over time, and per-subject averages.

import React, { useMemo, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { usePaperAttempts } from './usePaperAttempts';
import { groupStudents, attemptDate, attemptPct } from './testPaperStats';

function fmtDate(d) {
  if (!d) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminTestUsers({ user }) {
  const { attempts, loading } = usePaperAttempts();
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const students = useMemo(() => groupStudents(attempts), [attempts]);
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return students;
    return students.filter((s) => s.vuId.toUpperCase().includes(q) || s.name.toUpperCase().includes(q));
  }, [students, query]);

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Admin access required</h3>
        <p>Students sirf verified administrator dekh sakta hai.</p>
      </section>
    );
  }

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Students — progress</h3>
      <p>Attempts se bane students: VU ID, naam, attempts, average MCQ score, aakhri attempt. Kisi student par click kar ke us ki poori progress dekhein.</p>
      <label className="edx-exam-field">Search VU ID ya naam
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jaise BC230400878 ya Asad" />
      </label>
      {loading && <p role="status">Loading…</p>}
      {!loading && filtered.length === 0 && <p>Koi student nahi mila.</p>}
      {!loading && filtered.map((s) => {
        const open = openKey === s.key;
        const bySubject = new Map();
        s.attempts.forEach((a) => {
          const code = a.paperCode || a.paperSlug || 'Unknown';
          const row = bySubject.get(code) || { code, count: 0, pctSum: 0, pctCount: 0 };
          row.count += 1;
          const p = attemptPct(a);
          if (p !== null) {
            row.pctSum += p;
            row.pctCount += 1;
          }
          bySubject.set(code, row);
        });
        return (
          <div key={s.key} style={{ border: '1px solid rgba(127,127,127,0.3)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <button type="button" className="edx-exam-secondary" onClick={() => setOpenKey(open ? null : s.key)} style={{ width: '100%', textAlign: 'left' }}>
              <strong>{s.name}</strong> · VU ID {s.vuId} · {s.count} attempts · Avg {s.avgPct !== null ? `${s.avgPct}%` : '—'} · Last {fmtDate(s.lastAttempt)}
            </button>
            {open && (
              <div style={{ marginTop: 10 }}>
                <p><strong>Subject wise:</strong> {[...bySubject.values()].map((r) => `${r.code}: ${r.count} attempts${r.pctCount ? `, avg ${Math.round(r.pctSum / r.pctCount)}%` : ''}`).join(' · ')}</p>
                <ul>
                  {[...s.attempts].sort((a, b) => (attemptDate(b) || 0) - (attemptDate(a) || 0)).map((a) => {
                    const p = attemptPct(a);
                    return (
                      <li key={a.id}>
                        {fmtDate(attemptDate(a))} · {a.paperCode || a.paperSlug} · MCQ {a.mcqScore ?? '—'}/{a.mcqTotal ?? '—'}{p !== null ? ` (${p}%)` : ''} · {a.status || 'submitted'}
                        {a.teacherFeedback ? ` · Teacher: ${a.teacherFeedback}` : ''}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
