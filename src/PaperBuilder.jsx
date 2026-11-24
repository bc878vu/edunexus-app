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

import React, { useEffect, useMemo, useState } from 'react';
import { BANK_SUBJECTS, buildPaper } from './testPapersBank';
import { mergeBankSubjects } from './testPaperBankMerge';
import { useAdminBanks } from './useAdminBanks';
import { PaperRunner } from './TestPaper';
import PaperPopup from './PaperPopup';
import { patternUrl, PaperShareButtons } from './testPaperShare';

function countsFor(subject, lectureNo) {
  const { bank } = subject;
  const mcq = bank.mcqs.filter((q) => q.lectures.includes(lectureNo)).length;
  const short = bank.shorts.filter((q) => q.lectures.includes(lectureNo)).length;
  const long = bank.longs.filter((q) => q.lectures.includes(lectureNo)).length;
  return { mcq, short, long };
}

export default function PaperBuilder({ subjectCode, term, onBack }) {
  const { banks: adminBanks, loading: adminLoading } = useAdminBanks();
  const mergedSubjects = useMemo(() => mergeBankSubjects(BANK_SUBJECTS, adminBanks), [adminBanks]);
  // Match the term the student picked on the home page (a subject with both
  // Midterm and Finalterm banks used to always build from the first one).
  const subject = mergedSubjects.find((s) => s.code === subjectCode && (!term || s.term === term))
    || mergedSubjects.find((s) => s.code === subjectCode) || mergedSubjects[0];
  const [selected, setSelected] = useState([]);
  const [paper, setPaper] = useState(null);
  const [noData, setNoData] = useState(false);
  const [lectureFilter, setLectureFilter] = useState('');

  const rows = useMemo(() => subject.lectures.map((l) => ({ ...l, ...countsFor(subject, l.n) })), [subject]);
  const available = rows.filter((r) => r.mcq + r.short + r.long > 0);
  // Live totals for the current selection — the student sees what their
  // lectures actually hold (MCQs, shorts, longs) before generating, instead
  // of discovering it only after the paper is built.
  const selectedTotals = useMemo(() => {
    const sel = rows.filter((r) => selected.includes(r.n));
    return {
      mcq: sel.reduce((a, r) => a + r.mcq, 0),
      short: sel.reduce((a, r) => a + r.short, 0),
      long: sel.reduce((a, r) => a + r.long, 0),
    };
  }, [rows, selected]);
  // Lecture filter: number or title, so a 45-lecture subject does not need
  // scrolling through the whole grid to find one lecture.
  const filteredRows = useMemo(() => {
    const q = lectureFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.n).includes(q) || (r.title || '').toLowerCase().includes(q));
  }, [rows, lectureFilter]);
  // The builder opens below the home grid — start at the top so the heading
  // and the Generate button are in view, and do the same when the paper is ready.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  useEffect(() => { if (paper) window.scrollTo({ top: 0, behavior: 'smooth' }); }, [paper]);
  const unit = subject.unitLabel === 'Topic' ? 'Topic' : 'Lecture';
  const units = unit.toLowerCase() + 's';

  const toggle = (n) => setSelected((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b));
  const generated = paper;

  // An admin-only subject is unknown until the admin banks finish loading —
  // show a loading state instead of silently falling back to another subject.
  // (After all hooks above, so hook order never changes between renders.)
  if (adminLoading && !BANK_SUBJECTS.some((s) => s.code === subjectCode)) {
    return (
      <section className="edx-exam-card edx-exam-form edx-paper-builder edx-paper-page">
        <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to test papers</button>
        <p role="status">Paper bank loading…</p>
      </section>
    );
  }

  if (generated) {
    return <PaperRunner paper={generated} onBack={() => setPaper(null)} />;
  }

  return (
    <section className="edx-exam-card edx-exam-form edx-paper-builder edx-paper-page">
      <button type="button" className="edx-exam-secondary edx-paper-builder-back" onClick={onBack}>← Back to test papers</button>
      <div className="edx-paper-builder-hero">
        <span className="edx-paper-builder-tile" aria-hidden="true">{subject.code.replace(/[0-9].*$/, '') || 'VU'}</span>
        <div className="edx-paper-builder-hero-text">
          <h2>Build your own paper — {subject.code}</h2>
          <p>{subject.title} · {subject.scope}</p>
        </div>
        <span className={`edx-paper-builder-term term-${(subject.term || 'Midterm').toLowerCase()}`}>{subject.term}</span>
      </div>
      <p className="edx-paper-builder-note">The paper is built only from verified questions — a {unit.toLowerCase()} with no verified questions cannot be selected, and nothing will be invented. Pick any {units} you want; the paper is built only from verified bank questions for those {units}.</p>
      <div className="edx-paper-builder-toolbar">
        <label className="edx-exam-field edx-paper-builder-search">Find {unit}<input type="text" value={lectureFilter} onChange={(e) => setLectureFilter(e.target.value)} placeholder="Enter a number or title, e.g. 5 or Kinematics" /></label>
        <div className="edx-exam-actions edx-paper-builder-actions-row">
          <button type="button" className="edx-exam-secondary" onClick={() => setSelected(available.map((r) => r.n))}>Select all available</button>
          <button type="button" className="edx-exam-secondary" onClick={() => setSelected([])}>Clear</button>
          {selected.length > 0 && <span className="edx-paper-selected-chip">{selected.length} selected</span>}
        </div>
      </div>
      {lectureFilter.trim() !== '' && <p className="edx-paper-meta-line">{filteredRows.length} of {rows.length} {units} — “{lectureFilter.trim()}”</p>}
      <div className="edx-paper-lecture-grid">
        {filteredRows.map((r) => {
          const empty = r.mcq + r.short + r.long === 0;
          return (
            <label key={r.n} className={'edx-paper-lecture-card' + (empty ? ' disabled' : '') + (selected.includes(r.n) ? ' selected' : '')}>
              <input type="checkbox" className="edx-paper-lecture-input" disabled={empty} checked={selected.includes(r.n)} onChange={() => toggle(r.n)} />
              <span className="edx-paper-lecture-check" aria-hidden="true">✓</span>
              <span className="edx-paper-lecture-body">
                <span className="edx-paper-lecture-title"><strong>{unit} {r.n}</strong> — {r.title}</span>
                {empty ? (
                  <span className="edx-paper-lecture-empty">0 verified questions</span>
                ) : (
                  <span className="edx-paper-lecture-counts">
                    <span className="edx-paper-count-pill mcq">{r.mcq} MCQs</span>
                    <span className="edx-paper-count-pill short">{r.short} short</span>
                    <span className="edx-paper-count-pill long">{r.long} long</span>
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <p className="edx-paper-selected-line">{selected.length === 0 ? `Select at least one ${unit.toLowerCase()} to build a paper.` : `${selected.length} ${units} selected · ${selectedTotals.mcq} MCQs · ${selectedTotals.short} short · ${selectedTotals.long} long available`}</p>
      <div className="edx-paper-builder-actions">
        <button type="button" className="edx-exam-primary" disabled={selected.length === 0}
          onClick={() => { const p = buildPaper(subject, selected); if (p.mcqs.length + p.shorts.length + p.longs.length === 0) { setNoData(true); return; } setPaper(p); }}>Generate my paper</button>
        {selected.length > 0 && (
          <span className="edx-paper-builder-share">
            <span>Share a link to this selection:</span>
            <PaperShareButtons
              url={patternUrl({ subject: subject.code, term: subject.term, lectures: selected, mcq: 20, short: 3, long: 3 })}
              title={subject.code + ' — ' + subject.title + ' — Test Paper'}
            />
          </span>
        )}
      </div>
      {noData && <PaperPopup code={subject.code} note={'No verified questions were found for the selected ' + units + ' (' + selected.join(', ') + '). Please contact the admin.'} onClose={() => setNoData(false)} />}
      <p className="edx-paper-note">Pattern: up to 20 MCQs, 3 shorts, 3 longs (90 minutes). If your lectures hold fewer verified questions, the paper is shorter and says so — it is never padded with guesses.</p>
    </section>
  );
}
