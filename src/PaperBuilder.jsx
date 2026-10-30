// src/PaperBuilder.jsx — Intelligent Paper Builder.
//
// The student picks a subject and any lectures they want; the paper is then
// built ONLY from the verified lecture-mapped bank (src/testPapersBank.js).
// "Intelligent" here means four concrete behaviours, nothing more:
//   1. Balanced coverage: questions are drawn round-robin across the selected
//      lectures, so one lecture cannot crowd the paper out.
//   2. Most-repeated first: within each lecture, questions whose concept also
//      appears in the subjective bank ("repeated") come before the rest.
//   3. No padding, ever: if the selected lectures hold fewer verified
//      questions than the pattern (20 MCQs, 3 shorts, 3 longs), the paper is
//      simply shorter and says so — no invented question fills the gap.
//   4. Weak-lecture report: after submit, the result names the lectures with
//      the most wrong MCQ answers (computed in TestPaper.jsx's result view).

import React, { useMemo, useState } from 'react';
import { BANK_SUBJECTS, buildPaper } from './testPapersBank';
import { mergeBankSubjects } from './testPaperBankMerge';
import { useAdminBanks } from './useAdminBanks';
import { PaperRunner } from './TestPaper';
import PaperPopup from './PaperPopup';

function countsFor(subject, lectureNo) {
  const { bank } = subject;
  const mcq = bank.mcqs.filter((q) => q.lectures.includes(lectureNo)).length;
  const short = bank.shorts.filter((q) => q.lectures.includes(lectureNo)).length;
  const long = bank.longs.filter((q) => q.lectures.includes(lectureNo)).length;
  return { mcq, short, long };
}

export default function PaperBuilder({ subjectCode, onBack }) {
  const { banks: adminBanks, loading: adminLoading } = useAdminBanks();
  const mergedSubjects = useMemo(() => mergeBankSubjects(BANK_SUBJECTS, adminBanks), [adminBanks]);
  const subject = mergedSubjects.find((s) => s.code === subjectCode) || mergedSubjects[0];
  const [selected, setSelected] = useState([]);
  const [paper, setPaper] = useState(null);
  const [noData, setNoData] = useState(false);

  const rows = useMemo(() => subject.lectures.map((l) => ({ ...l, ...countsFor(subject, l.n) })), [subject]);
  const available = rows.filter((r) => r.mcq + r.short + r.long > 0);

  const toggle = (n) => setSelected((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b));
  const generated = paper;

  // An admin-only subject is unknown until the admin banks finish loading —
  // show a loading state instead of silently falling back to another subject.
  // (After all hooks above, so hook order never changes between renders.)
  if (adminLoading && !BANK_SUBJECTS.some((s) => s.code === subjectCode)) {
    return (
      <section className="edx-exam-card edx-exam-form edx-paper-builder edx-paper-page">
        <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to test papers</button>
        <p role="status">Paper bank load ho raha hai…</p>
      </section>
    );
  }

  if (generated) {
    return <PaperRunner paper={generated} onBack={() => setPaper(null)} />;
  }

  return (
    <section className="edx-exam-card edx-exam-form edx-paper-builder edx-paper-page">
      <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to test papers</button>
      <h2>Build your own paper — {subject.code}</h2>
      <p>{subject.title} · {subject.term} · {subject.scope}. Pick any lectures you want; the paper is built only from verified bank questions for those lectures.</p>
      <p className="edx-paper-meta-line">Bank: {subject.bank.mcqs.length} MCQs + {subject.bank.shorts.length} shorts + {subject.bank.longs.length} longs, lecture-mapped. Lectures with 0 verified questions cannot be selected — nothing is invented to fill them.</p>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-secondary" onClick={() => setSelected(available.map((r) => r.n))}>Select all available</button>
        <button type="button" className="edx-exam-secondary" onClick={() => setSelected([])}>Clear</button>
      </div>
      <div className="edx-paper-lecture-grid">
        {rows.map((r) => {
          const empty = r.mcq + r.short + r.long === 0;
          return (
            <label key={r.n} className={'edx-paper-lecture' + (empty ? ' disabled' : '')}>
              <input type="checkbox" disabled={empty} checked={selected.includes(r.n)} onChange={() => toggle(r.n)} />
              <span><strong>Lecture {r.n}</strong> — {r.title}</span>
              <span className="edx-paper-count">{empty ? '0 verified questions' : `${r.mcq} MCQs · ${r.short} short · ${r.long} long`}</span>
            </label>
          );
        })}
      </div>
      <p className="edx-paper-selected-line">{selected.length === 0 ? 'Select at least one lecture to build a paper.' : `Selected: lectures ${selected.join(', ')}`}</p>
      <button type="button" className="edx-exam-primary" disabled={selected.length === 0}
        onClick={() => { const p = buildPaper(subject, selected); if (p.mcqs.length + p.shorts.length + p.longs.length === 0) { setNoData(true); return; } setPaper(p); }}>Generate my paper</button>
      {noData && <PaperPopup code={subject.code} note={'Selected lectures (' + selected.join(', ') + ') ke liye koi verified sawal nahi mila. Admin se contact karein.'} onClose={() => setNoData(false)} />}
      <p className="edx-paper-note">Pattern: up to 20 MCQs, 3 shorts, 3 longs (90 minutes). If your lectures hold fewer verified questions, the paper is shorter and says so — it is never padded with guesses.</p>
    </section>
  );
}
