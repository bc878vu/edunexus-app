// src/AdminPaperPatterns.jsx — admin builds a paper pattern and shares its link.
//
// A pattern = subject + lectures + question counts. The link is stateless
// (everything lives in the URL query), so it works the moment it is shared:
//   /test-papers?subject=PHY101&lectures=1,3&mcqs=20&shorts=3&longs=3
// The student needs no account; the paper rebuilds exactly (same builder
// function the student builder uses). The student's attempt is saved for the
// teacher exactly like any other paper (Firestore paperAttempts rules must
// be published for the save to succeed — same as every other paper).

import React, { useMemo, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { BANK_SUBJECTS } from './testPapersBank';
import { mergeBankSubjects } from './testPaperBankMerge';
import { useAdminBanks } from './useAdminBanks';

function countsFor(subject, lectureNo) {
  const { bank } = subject;
  return {
    mcq: bank.mcqs.filter((q) => q.lectures.includes(lectureNo)).length,
    short: bank.shorts.filter((q) => q.lectures.includes(lectureNo)).length,
    long: bank.longs.filter((q) => q.lectures.includes(lectureNo)).length,
  };
}

export default function AdminPaperPatterns({ user }) {
  const { banks: adminBanks } = useAdminBanks();
  const subjects = useMemo(() => mergeBankSubjects(BANK_SUBJECTS, adminBanks), [adminBanks]);
  const [subjectCode, setSubjectCode] = useState(BANK_SUBJECTS[0].code);
  const subject = subjects.find((s) => s.code === subjectCode) || subjects[0];
  const [selected, setSelected] = useState([]);
  const [mcqTarget, setMcqTarget] = useState(20);
  const [shortTarget, setShortTarget] = useState(3);
  const [longTarget, setLongTarget] = useState(3);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Paper Patterns</h3>
        <p>Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.</p>
      </section>
    );
  }

  const rows = subject.lectures.map((l) => ({ ...l, ...countsFor(subject, l.n) }));
  const available = rows.filter((r) => r.mcq + r.short + r.long > 0);
  const toggle = (n) => { setSelected((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)); setLink(''); setCopied(false); };

  const createLink = () => {
    if (selected.length === 0) return;
    const params = new URLSearchParams({
      subject: subject.code, lectures: selected.join(','),
      mcqs: String(mcqTarget), shorts: String(shortTarget), longs: String(longTarget),
    });
    setLink(window.location.origin + '/test-papers?' + params.toString());
    setCopied(false);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch (_) {}
  };
  const waUrl = link ? 'https://wa.me/?text=' + encodeURIComponent('Test paper: ' + link) : '';

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Paper Patterns — share a paper link with any student</h3>
      <p>Pick a subject and lectures, set the counts, and share the link. The student opens it and gets exactly that paper — no login needed. Only verified bank questions are used, never invented ones.</p>
      <label className="edx-exam-field">Subject
        <select value={subjectCode} onChange={(e) => { setSubjectCode(e.target.value); setSelected([]); setLink(''); }}>
          {subjects.map((s) => (
            <option key={s.code} value={s.code}>{s.code} — {s.title} ({s.term})</option>
          ))}
        </select>
      </label>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-secondary" onClick={() => { setSelected(available.map((r) => r.n)); setLink(''); }}>Select all available</button>
        <button type="button" className="edx-exam-secondary" onClick={() => { setSelected([]); setLink(''); }}>Clear</button>
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
      <div className="edx-exam-actions">
        <label className="edx-exam-field">MCQs
          <select value={mcqTarget} onChange={(e) => setMcqTarget(Number(e.target.value))}>
            {[10, 20, 30, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </label>
        <label className="edx-exam-field">Shorts
          <select value={shortTarget} onChange={(e) => setShortTarget(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </label>
        <label className="edx-exam-field">Longs
          <select value={longTarget} onChange={(e) => setLongTarget(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </label>
      </div>
      <button type="button" className="edx-exam-primary" disabled={selected.length === 0} onClick={createLink}>Create share link</button>
      {link && (
        <>
          <label className="edx-exam-field">Share link<input type="text" readOnly value={link} onFocus={(e) => e.target.select()} /></label>
          <div className="edx-exam-actions">
            <button type="button" className="edx-exam-secondary" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
            <a className="edx-exam-secondary" href={link} target="_blank" rel="noopener noreferrer">Open link</a>
            <a className="edx-paper-wa-btn" href={waUrl} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          </div>
          <p className="edx-paper-note">Student ka attempt teacher ko save hone ke liye Firestore rules publish hona zaroori hai (wohi pehle wala step).</p>
        </>
      )}
    </section>
  );
}
