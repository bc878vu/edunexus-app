// src/AdminPaperAttempts.jsx — teacher review of test-paper attempts.
//
// Admin-only surface (rendered inside the Exam admin tools). The admin gate
// matches ExamPaperReviewManager: the tab session must be active, otherwise
// loads and saves refuse with an explanation instead of failing silently.
// Reads/writes are enforced by the deployed Firestore rules: only the admin
// account may list all attempts or save teacher marks.

import React, { useEffect, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import {
  listPaperAttempts,
  reviewPaperAttempt,
} from './db/paperAttempts';
import { getTestPaper } from './testPapersData';

function fmtDate(ts) {
  try {
    const d = ts && typeof ts.toDate === 'function' ? ts.toDate()
      : ts && ts.seconds ? new Date(ts.seconds * 1000)
      : ts ? new Date(ts) : null;
    return d ? d.toLocaleString() : '—';
  } catch (_) { return '—'; }
}

export default function AdminPaperAttempts({ user }) {
  const allowed = adminPanelAccess(user);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!adminPanelAccess(user)) {
      setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await listPaperAttempts();
      setAttempts(rows);
    } catch (e) {
      setError('Could not load paper attempts. If this is a permission error, publish the paperAttempts rules in the Firebase console (firestore.rules) and try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (allowed) void load(); }, [allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAttempt = (a) => {
    setSelected(a);
    setMessage('');
    const m = {};
    const subj = [...(a.shortAnswers || []), ...(a.longAnswers || [])];
    subj.forEach((_, i) => { m[i] = a.teacherMarks && a.teacherMarks[i] !== undefined ? a.teacherMarks[i] : ''; });
    setMarks(m);
    setFeedback(a.teacherFeedback || '');
  };

  const saveReview = async () => {
    if (!adminPanelAccess(user)) {
      setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const clean = {};
      Object.keys(marks).forEach((k) => { const v = Number(marks[k]); if (!Number.isNaN(v)) clean[k] = v; });
      await reviewPaperAttempt(selected.id, { teacherMarks: clean, teacherFeedback: feedback });
      setMessage('Review saved.');
      const next = { ...selected, teacherMarks: clean, teacherFeedback: feedback, status: 'reviewed' };
      setSelected(next);
      setAttempts((prev) => prev.map((a) => (a.id === next.id ? next : a)));
    } catch (_) {
      setError('Could not save the review. Check your admin session and the deployed Firestore rules.');
    } finally { setSaving(false); }
  };

  if (!allowed) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Paper Attempts</h3>
        <p>Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.</p>
      </section>
    );
  }

  if (selected) {
    const paper = getTestPaper(selected.paperSlug);
    const subjQuestions = paper ? [...paper.shorts.map((q) => ({ ...q, marks: 3 })), ...paper.longs.map((q) => ({ ...q, marks: 5 }))]
      : [...(selected.shortAnswers || []).map((_, i) => ({ q: 'Short Q' + (i + 1), marks: 3 })),
         ...(selected.longAnswers || []).map((_, i) => ({ q: 'Long Q' + (i + 1), marks: 5 }))];
    const subjAnswers = [...(selected.shortAnswers || []), ...(selected.longAnswers || [])];
    const teacherTotal = selected.teacherMarks
      ? Object.values(selected.teacherMarks).reduce((a, b) => a + (Number(b) || 0), 0)
      : null;
    return (
      <section className="edx-exam-card edx-exam-form">
        <button type="button" className="edx-exam-secondary" onClick={() => setSelected(null)}>Back to attempts</button>
        <h3>{selected.studentName} · VU ID {selected.studentVuId}</h3>
        <p>{selected.paperCode || selected.paperSlug} · {fmtDate(selected.createdAt)} · MCQ {selected.mcqScore}/{selected.mcqTotal}
          {teacherTotal !== null ? ' · Teacher (subjective): ' + teacherTotal : ' · Status: ' + (selected.status || 'submitted')}</p>
        <h4>MCQ answers</h4>
        {paper ? paper.mcqs.map((q, i) => {
          const mine = (selected.mcqAnswers || {})[i];
          return (
            <div key={i} className="edx-paper-review-row">
              <p><strong>Q{i + 1}.</strong> {q.q}</p>
              <p>Student: {mine || 'Not answered'} · Correct: {q.answer} — {mine === q.answer ? 'Correct' : 'Wrong'}</p>
            </div>
          );
        }) : <p>Paper content not found for this attempt.</p>}
        <h4>Subjective answers — teacher marks</h4>
        {subjQuestions.map((q, i) => (
          <div key={i} className="edx-paper-review-row">
            <p><strong>{q.q}</strong> ({q.marks} marks)</p>
            <p><strong>Student answer:</strong></p>
            <p className="edx-paper-answer-text">{subjAnswers[i] || 'Not answered'}</p>
            {q.modelAnswer && (<><p><strong>Model answer:</strong></p><p className="edx-paper-answer-text">{q.modelAnswer}</p></>)}
            <label className="edx-exam-field">Teacher marks (0–{q.marks})
              <input type="number" min={0} max={q.marks} value={marks[i] === undefined ? '' : marks[i]} onChange={(e) => setMarks((prev) => ({ ...prev, [i]: e.target.value }))} />
            </label>
          </div>
        ))}
        <label className="edx-exam-field">Feedback for student<textarea rows={3} maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></label>
        {message && <p role="status">{message}</p>}
        {error && <p role="alert" className="edx-exam-alert">{error}</p>}
        <button type="button" className="edx-exam-primary" disabled={saving} onClick={saveReview}>{saving ? 'Saving…' : 'Save review'}</button>
      </section>
    );
  }

  return (
    <section className="edx-exam-card edx-exam-form">
      <div className="edx-exam-between">
        <h3>Paper Attempts ({attempts.length})</h3>
        <button type="button" className="edx-exam-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      {error && <p role="alert" className="edx-exam-alert">{error}</p>}
      {loading && <p role="status">Loading attempts…</p>}
      {!loading && attempts.length === 0 && !error && <p>No paper attempts yet.</p>}
      {attempts.map((a) => (
        <div key={a.id} className="edx-paper-review-row">
          <p><strong>{a.studentName || 'Unnamed'}</strong> · VU ID {a.studentVuId || '—'} · {a.paperCode || a.paperSlug}</p>
          <p>{fmtDate(a.createdAt)} · MCQ {a.mcqScore}/{a.mcqTotal} · Status: {a.status || 'submitted'}</p>
          <button type="button" className="edx-exam-secondary" onClick={() => openAttempt(a)}>Review</button>
        </div>
      ))}
    </section>
  );
}
