// src/AdminTestDashboard.jsx — Test-paper admin dashboard: totals + graphs.
//
// All figures come from the last 200 attempts (the admin list cap) — the
// subtitle says so, so a small sample never reads as a whole-site total.
// Charts are plain responsive bars (no chart dependency, no bundle cost).

import React, { useMemo } from 'react';
import { adminPanelAccess } from './adminSession';
import { usePaperAttempts } from './usePaperAttempts';
import { attemptsPerDay, statsBySubject, scoreDistribution, attemptPct } from './testPaperStats';

function Bars({ rows, valueLabel }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ minWidth: 90, fontSize: 13 }}>{r.label}</span>
          <span style={{ flex: 1, background: 'rgba(127,127,127,0.18)', borderRadius: 6, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: 18, width: `${Math.round((r.value / max) * 100)}%`, background: 'var(--edx-accent, #2563eb)', borderRadius: 6 }} />
          </span>
          <span style={{ minWidth: 44, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{r.value}{valueLabel || ''}</span>
        </div>
      ))}
      {rows.length === 0 && <p>Koi data nahi.</p>}
    </div>
  );
}

export default function AdminTestDashboard({ user }) {
  const { attempts, loading } = usePaperAttempts();
  const perDay = useMemo(() => attemptsPerDay(attempts, 14), [attempts]);
  const bySubject = useMemo(() => statsBySubject(attempts), [attempts]);
  const dist = useMemo(() => scoreDistribution(attempts), [attempts]);
  const pcts = useMemo(() => attempts.map(attemptPct).filter((p) => p !== null), [attempts]);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const students = useMemo(() => new Set(attempts.map((a) => a.studentVuId || a.userId).filter(Boolean)).size, [attempts]);
  const reviewed = attempts.filter((a) => a.status === 'reviewed').length;

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Admin access required</h3>
        <p>Dashboard sirf verified administrator dekh sakta hai.</p>
      </section>
    );
  }

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Test Paper Dashboard</h3>
      <p>Last 200 attempts ki bunyaad par — poori site ka total nahi, jo list load hoti hai us ka khulasa hai.</p>
      {loading && <p role="status">Loading…</p>}
      {!loading && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              ['Attempts', attempts.length],
              ['Students', students],
              ['Average MCQ score', avg !== null ? `${avg}%` : '—'],
              ['Teacher-reviewed', reviewed],
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid rgba(127,127,127,0.3)', borderRadius: 12, padding: '10px 16px', minWidth: 120 }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
                <div style={{ fontSize: 13 }}>{label}</div>
              </div>
            ))}
          </div>
          <h4>Attempts — last 14 din</h4>
          <Bars rows={perDay.map((d) => ({ label: d.day.slice(5), value: d.count }))} />
          <h4>Attempts — subject wise</h4>
          <Bars rows={bySubject.map((s) => ({ label: s.code, value: s.attempts }))} />
          <h4>Average MCQ score — subject wise</h4>
          <Bars rows={bySubject.filter((s) => s.avgPct !== null).map((s) => ({ label: s.code, value: s.avgPct }))} valueLabel="%" />
          <h4>Score distribution (MCQ %)</h4>
          <Bars rows={dist.map((b) => ({ label: b.label, value: b.count }))} />
        </>
      )}
    </section>
  );
}
