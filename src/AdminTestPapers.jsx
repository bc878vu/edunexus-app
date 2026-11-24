// src/AdminTestPapers.jsx — Admin tab: saved papers, saved patterns, assignments.
//
// "Khud paper banana" means the admin composes a paper here: pick a subject
// and lectures, set the counts, and save it. Two things can be saved:
//   1. A fixed paper — students see it as a ready-made card on /test-papers
//      (and get a share link ?saved=<id>).
//   2. A pattern link — the stateless ?subject=&lectures=&mcqs=… link, saved
//      under a name so patterns stay manageable per subject.
// Assignments attach a saved paper or pattern to VU IDs; students find them
// by entering their VU ID on /test-papers. Everything here uses verified
// bank questions only — the admin never types questions by hand, so no
// invented question can enter a paper through this tab.

import React, { useEffect, useMemo, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { BANK_SUBJECTS, buildPaper } from './testPapersBank';
import { mergeBankSubjects } from './testPaperBankMerge';
import { useAdminBanks } from './useAdminBanks';
import {
  listSavedPapers, saveSavedPaper, deleteSavedPaper,
  listSavedPatterns, saveSavedPattern, deleteSavedPattern,
  listAssignments, saveAssignment, deleteAssignment,
} from './db/testPaperAdmin.js';

// Picker key: CODE|Term. The subject picker must distinguish a subject's
// Midterm and Finalterm banks — using the code alone made every selection
// resolve to the first (Midterm) bank, so no Finalterm fixed paper could
// ever be built from this tab.
const subjectKey = (s) => `${s.code}|${s.term}`;

function countsFor(subject, lectureNo) {
  const { bank } = subject;
  return {
    mcq: bank.mcqs.filter((q) => q.lectures.includes(lectureNo)).length,
    short: bank.shorts.filter((q) => q.lectures.includes(lectureNo)).length,
    long: bank.longs.filter((q) => q.lectures.includes(lectureNo)).length,
  };
}

export default function AdminTestPapers({ user }) {
  const { banks: adminBanks } = useAdminBanks();
  const subjects = useMemo(() => mergeBankSubjects(BANK_SUBJECTS, adminBanks), [adminBanks]);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState(subjectKey(BANK_SUBJECTS[0]));
  const subject = subjects.find((s) => subjectKey(s) === selectedSubjectKey) || subjects[0];
  const adminUnit = subject.unitLabel === 'Topic' ? 'Topic' : 'Lecture';
  const [selected, setSelected] = useState([]);
  const [mcqTarget, setMcqTarget] = useState(20);
  const [shortTarget, setShortTarget] = useState(3);
  const [longTarget, setLongTarget] = useState(3);
  const [paperTitle, setPaperTitle] = useState('');
  const [patternName, setPatternName] = useState('');
  const [papers, setPapers] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmKey, setConfirmKey] = useState('');
  const [assignFor, setAssignFor] = useState(null);
  const [assignIds, setAssignIds] = useState('');
  const [copied, setCopied] = useState('');

  const reload = async () => {
    try {
      const [p, pat, asg] = await Promise.all([listSavedPapers(), listSavedPatterns(), listAssignments()]);
      setPapers(p);
      setPatterns(pat);
      setAssignments(asg);
    } catch (e) {
      setError('List failed to load: ' + (e && e.message ? e.message : 'unknown error'));
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Admin access required</h3>
        <p>Only a verified administrator can create papers.</p>
      </section>
    );
  }

  const rows = subject.lectures.map((l) => ({ ...l, ...countsFor(subject, l.n) }));
  const available = rows.filter((r) => r.mcq + r.short + r.long > 0);
  const toggle = (n) => setSelected((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b));
  const built = selected.length ? buildPaper(subject, selected, { mcq: mcqTarget, short: shortTarget, long: longTarget }) : null;
  const builtTotal = built ? built.mcqs.length + built.shorts.length + built.longs.length : 0;

  const onSavePaper = async () => {
    if (!paperTitle.trim() || !built || builtTotal === 0) return;
    setBusy(true);
    setError('');
    try {
      const id = await saveSavedPaper({
        title: paperTitle.trim(),
        code: subject.code,
        term: subject.term,
        lectures: selected,
        mcq: mcqTarget, short: shortTarget, long: longTarget,
        builtCounts: { mcqs: built.mcqs.length, shorts: built.shorts.length, longs: built.longs.length, marks: built.marks },
      });
      setNotice(`Paper saved: "${paperTitle.trim()}" — students will see a ready-made card. Link: /test-papers?saved=${id}`);
      setPaperTitle('');
      setSelected([]);
      await reload();
    } catch (e) {
      setError('Save failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const onSavePattern = async () => {
    if (!patternName.trim() || selected.length === 0) return;
    const params = new URLSearchParams({
      subject: subject.code, term: subject.term, lectures: selected.join(','),
      mcqs: String(mcqTarget), shorts: String(shortTarget), longs: String(longTarget),
    });
    const link = window.location.origin + '/test-papers?' + params.toString();
    setBusy(true);
    setError('');
    try {
      await saveSavedPattern({ name: patternName.trim(), code: subject.code, link, lectures: selected, mcq: mcqTarget, short: shortTarget, long: longTarget });
      setNotice(`Pattern saved: "${patternName.trim()}" (${subject.code}).`);
      setPatternName('');
      setSelected([]);
      await reload();
    } catch (e) {
      setError('Save failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const onAssign = async (target) => {
    const vuIds = assignIds.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean);
    if (vuIds.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await saveAssignment({ ...target, vuIds });
      setNotice(`Assigned to ${vuIds.length} VU ID(s) — students can enter their VU ID to see this paper on /test-papers.`);
      setAssignFor(null);
      setAssignIds('');
      await reload();
    } catch (e) {
      setError('Assign failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const onDelete = async (kind, id) => {
    const key = `${kind}::${id}`;
    if (confirmKey !== key) {
      setConfirmKey(key);
      return;
    }
    setBusy(true);
    try {
      if (kind === 'paper') await deleteSavedPaper(id);
      else if (kind === 'pattern') await deleteSavedPattern(id);
      else await deleteAssignment(id);
      setConfirmKey('');
      await reload();
    } catch (e) {
      setError('Delete failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch (_) {}
  };

  const patternsBySubject = new Map();
  patterns.forEach((p) => {
    if (!patternsBySubject.has(p.code)) patternsBySubject.set(p.code, []);
    patternsBySubject.get(p.code).push(p);
  });

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Papers — create papers, save patterns, assign them</h3>
      <p>Choose a subject and lectures, set the counts — the paper is built only from verified bank questions. Save a fixed paper (students will see a ready-made card) or save a pattern link (it will stay in the subject-wise list). Assign any paper or pattern to VU IDs.</p>

      <label className="edx-exam-field">Subject
        <select value={selectedSubjectKey} onChange={(e) => { setSelectedSubjectKey(e.target.value); setSelected([]); }}>
          {subjects.map((s) => (<option key={subjectKey(s)} value={subjectKey(s)}>{s.code} — {s.title} ({s.term})</option>))}
        </select>
      </label>
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
              <span><strong>{adminUnit} {r.n}</strong> — {r.title}</span>
              <span className="edx-paper-count">{empty ? '0 verified questions' : `${r.mcq} MCQs · ${r.short} short · ${r.long} long`}</span>
            </label>
          );
        })}
      </div>
      <div className="edx-exam-actions">
        <label className="edx-exam-field">MCQs
          <select value={mcqTarget} onChange={(e) => setMcqTarget(Number(e.target.value))}>{[10, 20, 30, 50].map((n) => (<option key={n} value={n}>{n}</option>))}</select>
        </label>
        <label className="edx-exam-field">Shorts
          <select value={shortTarget} onChange={(e) => setShortTarget(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}</select>
        </label>
        <label className="edx-exam-field">Longs
          <select value={longTarget} onChange={(e) => setLongTarget(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}</select>
        </label>
      </div>
      {built && <p role="status">Preview: {built.mcqs.length} MCQs + {built.shorts.length} shorts + {built.longs.length} longs, {built.marks.total} marks — {builtTotal === 0 ? 'These lectures have no verified questions, so no paper will be built.' : 'This is the paper that will be built; nothing will be invented.'}</p>}
      <label className="edx-exam-field">Fixed paper title
        <input type="text" value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} placeholder="e.g. ACC501 Midterm — Lectures 1-9" />
      </label>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-primary" disabled={!paperTitle.trim() || !built || builtTotal === 0 || busy} onClick={onSavePaper}>Save fixed paper</button>
      </div>
      <label className="edx-exam-field">Pattern name
        <input type="text" value={patternName} onChange={(e) => setPatternName(e.target.value)} placeholder="e.g. ACC501 Lec 1-9 Full" />
      </label>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-secondary" disabled={!patternName.trim() || selected.length === 0 || busy} onClick={onSavePattern}>Save pattern link</button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <h4>Saved fixed papers ({papers.length})</h4>
      {papers.length === 0 && <p>No fixed paper has been saved yet.</p>}
      <ul className="edx-paper-admin-list">
        {papers.map((p) => {
          const link = window.location.origin + '/test-papers?saved=' + p.id;
          const assigning = assignFor && assignFor.paperType === 'saved' && assignFor.paperId === p.id;
          return (
            <li key={p.id} className="edx-paper-admin-row">
              <span className="edx-paper-admin-row-text"><strong>{p.title}</strong> · {p.code} · {(subjects.find((s) => s.code === p.code && (!p.term || s.term === p.term)) || subjects.find((s) => s.code === p.code) || {}).unitLabel === 'Topic' ? 'Topics' : 'Lectures'} {p.lectures.join(', ')} · {p.mcq}/{p.short}/{p.long}</span>
              <span className="edx-paper-admin-row-actions">
              <button type="button" className="edx-exam-secondary" onClick={() => copy(link, 'paper:' + p.id)}>{copied === 'paper:' + p.id ? 'Copied!' : 'Copy link'}</button>
              <button type="button" className="edx-exam-secondary" onClick={() => { setAssignFor(assigning ? null : { paperType: 'saved', paperId: p.id, paperTitle: p.title }); setAssignIds(''); }}>Assign</button>
              <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => onDelete('paper', p.id)}>{confirmKey === 'paper::' + p.id ? 'Confirm delete?' : 'Delete'}</button>
              </span>
              {assigning && (
                <div style={{ marginTop: 8 }}>
                  <label className="edx-exam-field">VU IDs (comma-separated)
                    <input type="text" value={assignIds} onChange={(e) => setAssignIds(e.target.value)} placeholder="BC230400878, BC230400879" />
                  </label>
                  <button type="button" className="edx-exam-primary" disabled={busy} onClick={() => onAssign(assignFor)}>Assign</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <h4>Saved patterns — subject wise ({patterns.length})</h4>
      {patterns.length === 0 && <p>No pattern has been saved yet. Save links created from the Patterns tab here.</p>}
      {[...patternsBySubject.entries()].map(([code, list]) => (
        <div key={code}>
          <p><strong>{code}</strong></p>
          <ul className="edx-paper-admin-list">
            {list.map((p) => {
              const assigning = assignFor && assignFor.paperType === 'pattern' && assignFor.paperId === p.id;
              return (
                <li key={p.id} className="edx-paper-admin-row">
                  <span className="edx-paper-admin-row-text"><strong>{p.name}</strong> · {(subjects.find((s) => s.code === p.code) || {}).unitLabel === 'Topic' ? 'Topics' : 'Lectures'} {p.lectures.join(', ')} · {p.mcq}/{p.short}/{p.long}</span>
                  <span className="edx-paper-admin-row-actions">
                  <button type="button" className="edx-exam-secondary" onClick={() => copy(p.link, 'pat:' + p.id)}>{copied === 'pat:' + p.id ? 'Copied!' : 'Copy link'}</button>
                  <button type="button" className="edx-exam-secondary" onClick={() => { setAssignFor(assigning ? null : { paperType: 'pattern', paperId: p.id, paperTitle: p.name, link: p.link }); setAssignIds(''); }}>Assign</button>
                  <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => onDelete('pattern', p.id)}>{confirmKey === 'pattern::' + p.id ? 'Confirm delete?' : 'Delete'}</button>
                  </span>
                  {assigning && (
                    <div style={{ marginTop: 8 }}>
                      <label className="edx-exam-field">VU IDs (comma-separated)
                        <input type="text" value={assignIds} onChange={(e) => setAssignIds(e.target.value)} placeholder="BC230400878, BC230400879" />
                      </label>
                      <button type="button" className="edx-exam-primary" disabled={busy} onClick={() => onAssign(assignFor)}>Assign</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <h4>Assignments ({assignments.length})</h4>
      {assignments.length === 0 && <p>There are no assignments yet.</p>}
      <ul className="edx-paper-admin-list">
        {assignments.map((a) => (
          <li key={a.id} className="edx-paper-admin-row">
            <span className="edx-paper-admin-row-text"><strong>{a.paperTitle}</strong> · {a.paperType === 'saved' ? 'Fixed paper' : 'Pattern'} · VU IDs: {(a.vuIds || []).join(', ')}</span>
            <span className="edx-paper-admin-row-actions">
            <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => onDelete('assignment', a.id)}>{confirmKey === 'assignment::' + a.id ? 'Confirm delete?' : 'Delete'}</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
