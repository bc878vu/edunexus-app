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
import { BANK_SUBJECTS } from './testPapersBank';
import { PaperRunner } from './TestPaper';

const MCQ_TARGET = 20;
const SHORT_TARGET = 3;
const LONG_TARGET = 3;

function countsFor(subject, lectureNo) {
  const { bank } = subject;
  const mcq = bank.mcqs.filter((q) => q.lectures.includes(lectureNo)).length;
  const short = bank.shorts.filter((q) => q.lectures.includes(lectureNo)).length;
  const long = bank.longs.filter((q) => q.lectures.includes(lectureNo)).length;
  return { mcq, short, long };
}

// Round-robin across lectures: take one question per lecture in ascending
// lecture order, repeat, until the target is hit or every pool is empty.
// Within a lecture, "repeated" questions come first, then bank order.
function pickRoundRobin(rows, lectures, target) {
  const pools = {};
  lectures.forEach((n) => {
    pools[n] = rows
      .filter((q) => q.lectures.includes(n))
      .sort((a, b) => (b.repeated ? 1 : 0) - (a.repeated ? 1 : 0) || a.id.localeCompare(b.id));
  });
  const used = new Set();
  const out = [];
  let progress = true;
  while (out.length < target && progress) {
    progress = false;
    for (const n of lectures) {
      if (out.length >= target) break;
      const next = pools[n].find((q) => !used.has(q.id));
      if (next) { used.add(next.id); out.push(next); progress = true; }
    }
  }
  return out;
}

function buildPaper(subject, lectures) {
  const mcqs = pickRoundRobin(subject.bank.mcqs, lectures, MCQ_TARGET);
  const shorts = pickRoundRobin(subject.bank.shorts, lectures, SHORT_TARGET);
  const longs = pickRoundRobin(subject.bank.longs, lectures, LONG_TARGET);
  return {
    slug: 'builder:' + subject.code + ':' + lectures.join('-'),
    code: subject.code,
    title: subject.title,
    term: subject.term,
    lectures: 'Lectures ' + lectures.join(', ') + ' (selected)',
    minutes: 90,
    marks: { mcq: mcqs.length, short: shorts.length * 3, long: longs.length * 5,
             total: mcqs.length + shorts.length * 3 + longs.length * 5 },
    scopeNote: 'Custom paper: only verified bank questions for the lectures you selected. No question was invented to fill this paper.',
    sourceNote: 'MCQs and subjective questions verbatim from the verified midterm banks; lecture tags follow the handout lesson topics.',
    mcqs, shorts, longs,
    isCustom: true,
  };
}

export default function PaperBuilder({ subjectCode, onBack }) {
  const subject = BANK_SUBJECTS.find((s) => s.code === subjectCode) || BANK_SUBJECTS[0];
  const [selected, setSelected] = useState([]);
  const [paper, setPaper] = useState(null);

  const rows = useMemo(() => subject.lectures.map((l) => ({ ...l, ...countsFor(subject, l.n) })), [subject]);
  const available = rows.filter((r) => r.mcq + r.short + r.long > 0);

  const toggle = (n) => setSelected((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b));
  const generated = paper;

  if (generated) {
    return <PaperRunner paper={generated} onBack={() => setPaper(null)} />;
  }

  return (
    <section className="edx-exam-card edx-exam-form edx-paper-builder">
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
      <p>{selected.length === 0 ? 'Select at least one lecture to build a paper.' : `Selected: lectures ${selected.join(', ')}`}</p>
      <button type="button" className="edx-exam-primary" disabled={selected.length === 0}
        onClick={() => setPaper(buildPaper(subject, selected))}>Generate my paper</button>
      <p className="edx-paper-note">Pattern: up to {MCQ_TARGET} MCQs, {SHORT_TARGET} shorts, {LONG_TARGET} longs (90 minutes). If your lectures hold fewer verified questions, the paper is shorter and says so — it is never padded with guesses.</p>
    </section>
  );
}
