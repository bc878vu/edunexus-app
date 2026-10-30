// src/TpAdmin.jsx — Course Tests Admin, inside the EduNexus admin panel.
// Full management: subjects / MCQs / subjective / progress (teacher
// review) / users (block) / settings / admins — all on the EduNexus
// project's tp_* tables. Gate: EduNexus admin tab session (Firebase) +
// Supabase admin session (tp_is_admin or root veducator4).

import React, { useEffect, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { getTpSession, onTpAuthChange, signInTp, signOutTp, isTpAdmin, tpCounts, listTpSubjects, tpSupabase, TP_ROOT_ADMIN } from './db/tpCourse';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function Msg({ error, ok }) {
  return (<>
    {error && <p role="alert" className="edx-exam-alert">{error}</p>}
    {ok && <p role="status" className="edx-exam-success">{ok}</p>}
  </>);
}

export default function TpAdmin({ user }) {
  const [session, setSession] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [counts, setCounts] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('subjects');

  useEffect(() => {
    let live = true;
    getTpSession().then((s) => { if (live) setSession(s); });
    const off = onTpAuthChange((s) => { if (live) setSession(s); });
    return () => { live = false; off(); };
  }, []);

  useEffect(() => {
    if (!session) { setAdmin(false); setCounts(null); setSubjects([]); return; }
    let live = true;
    (async () => {
      const ok = await isTpAdmin(session);
      if (!live) return;
      setAdmin(ok);
      if (ok) {
        try { setCounts(await tpCounts()); setSubjects(await listTpSubjects()); } catch (e) { if (live) setError(e.message); }
      }
    })();
    return () => { live = false; };
  }, [session]);

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Course Tests Admin</h3>
        <p>Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.</p>
      </section>
    );
  }

  const login = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await signInTp(email.trim(), password); } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const refresh = async () => {
    setError('');
    try { setCounts(await tpCounts()); setSubjects(await listTpSubjects()); } catch (e) { setError(e.message); }
  };

  if (!session) {
    return (
      <section className="edx-exam-card edx-exam-form">
        <h3>Course Tests Admin — Supabase login</h3>
        <p>Is section ke liye Supabase login chahiye (veducator4 ya extra admin). EduNexus admin login (Firebase) is ke liye kaafi nahi — tp_* tables ka admin access Supabase session se milta hai.</p>
        <form onSubmit={login}>
          <label className="edx-exam-field">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="veducator4@gmail.com" /></label>
          <label className="edx-exam-field">Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p role="alert" className="edx-exam-alert">{error}</p>}
          <button type="submit" className="edx-exam-primary" disabled={busy}>Log in</button>
        </form>
      </section>
    );
  }

  if (!admin) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Course Tests Admin</h3>
        <p>Ye Supabase account ({session.user.email}) test papers ka admin nahi hai. Admin account se login karein.</p>
        <button type="button" className="edx-exam-secondary" onClick={() => signOutTp()}>Log out</button>
      </section>
    );
  }

  const TABS = ['subjects', 'mcqs', 'subjective', 'progress', 'users', 'settings', 'admins'];
  return (
    <div className="edx-exam-stack">
      <section className="edx-exam-card">
        <h3>Course Tests Admin</h3>
        <p>Connected as {session.user.email} · Data: EduNexus Supabase project (ek hi jagah).</p>
        {error && <p role="alert" className="edx-exam-alert">{error}</p>}
        {counts && (
          <ul className="edx-paper-meta">
            <li>{counts.subjects} subjects</li>
            <li>{counts.mcqs} MCQs</li>
            <li>{counts.shorts} short questions</li>
            <li>{counts.longs} long questions</li>
            <li>{counts.attempts} attempts</li>
            <li>{counts.profiles} profiles</li>
          </ul>
        )}
        <div className="edx-exam-actions">
          <button type="button" className="edx-exam-secondary" onClick={refresh}>Refresh</button>
          <button type="button" className="edx-exam-secondary" onClick={() => signOutTp()}>Log out</button>
        </div>
      </section>
      <nav className="edx-exam-tabs" aria-label="Course tests admin sections">
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'mcqs' ? 'MCQs' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {tab === 'subjects' && <SubjectsTab subjects={subjects} onChange={refresh} />}
      {tab === 'mcqs' && <McqsTab subjects={subjects} />}
      {tab === 'subjective' && <SubjTab subjects={subjects} />}
      {tab === 'progress' && <ProgressTab adminEmail={session.user.email} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'admins' && <AdminsTab />}
    </div>
  );
}

function SubjectsTab({ subjects, onChange }) {
  const [form, setForm] = useState({ id: '', code: '', name: '', term: 'Midterm', scope: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const save = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    const row = { code: form.code.trim(), name: form.name.trim(), term: form.term, scope: form.scope };
    const res = form.id
      ? await tpSupabase.from('tp_subjects').update(row).eq('id', form.id)
      : await tpSupabase.from('tp_subjects').insert({ id: newId(), ...row });
    if (res.error) { setError(res.error.message); return; }
    setOk('Subject saved.'); setForm({ id: '', code: '', name: '', term: 'Midterm', scope: '' }); onChange();
  };
  const remove = async (id, code) => {
    if (!window.confirm(`Delete ${code}? Is ke tamam MCQs aur subjective questions bhi delete ho jayenge (cascade).`)) return;
    const res = await tpSupabase.from('tp_subjects').delete().eq('id', id);
    if (res.error) { setError(res.error.message); return; }
    setOk('Subject deleted.'); onChange();
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Subjects</h3>
      <Msg error={error} ok={ok} />
      <form onSubmit={save}>
        <div className="edx-exam-form-grid">
          <label className="edx-exam-field">Code<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PHY101" /></label>
          <label className="edx-exam-field">Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="edx-exam-field">Term<select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}><option>Midterm</option><option>Finalterm</option></select></label>
          <label className="edx-exam-field">Scope<input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Lectures 1–22" /></label>
        </div>
        <div className="edx-exam-actions">
          <button type="submit" className="edx-exam-primary">{form.id ? 'Update subject' : 'Add subject'}</button>
          {form.id && <button type="button" className="edx-exam-secondary" onClick={() => setForm({ id: '', code: '', name: '', term: 'Midterm', scope: '' })}>Cancel edit</button>}
        </div>
      </form>
      <div className="edx-course-table-wrap"><table className="edx-course-table">
        <thead><tr><th>Code</th><th>Name</th><th>Term</th><th>Scope</th><th></th></tr></thead>
        <tbody>{subjects.map((s) => (
          <tr key={s.id}>
            <td><strong>{s.code}</strong></td><td>{s.name}</td><td>{s.term}</td><td>{s.scope}</td>
            <td>
              <button type="button" className="edx-exam-secondary" onClick={() => setForm({ id: s.id, code: s.code, name: s.name, term: s.term, scope: s.scope || '' })}>Edit</button>{' '}
              <button type="button" className="edx-exam-secondary" onClick={() => remove(s.id, s.code)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}

function McqsTab({ subjects }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ id: '', lecture_no: '', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' });
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const load = async (sid) => {
    const res = await tpSupabase.from('tp_mcqs').select('*').eq('subject_id', sid).order('lecture_no').order('created_at');
    if (res.error) { setError(res.error.message); return; }
    setRows(res.data || []);
  };
  useEffect(() => { if (subjectId) load(subjectId); }, [subjectId]);
  useEffect(() => { if (!subjectId && subjects[0]) setSubjectId(subjects[0].id); }, [subjects]);
  const save = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    if (form.options.some((o) => !o.trim())) { setError('Charon options zaroori hain.'); return; }
    const row = { subject_id: subjectId, lecture_no: form.lecture_no === '' ? null : Number(form.lecture_no), question: form.question, options: form.options, correct_index: Number(form.correct_index), explanation: form.explanation };
    const res = form.id
      ? await tpSupabase.from('tp_mcqs').update(row).eq('id', form.id)
      : await tpSupabase.from('tp_mcqs').insert({ id: newId(), ...row });
    if (res.error) { setError(res.error.message); return; }
    setOk('MCQ saved.'); setForm({ id: '', lecture_no: '', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' }); load(subjectId);
  };
  const importJson = async () => {
    setError(''); setOk('');
    let arr;
    try { arr = JSON.parse(json); } catch (_) { setError('JSON parse nahi hua. Top-level array chahiye.'); return; }
    if (!Array.isArray(arr)) { setError('Top-level array chahiye.'); return; }
    const bad = arr.find((q) => !q.question || !Array.isArray(q.options) || q.options.length !== 4 || q.correct_index === undefined || q.correct_index < 0 || q.correct_index > 3);
    if (bad) { setError('Har item mein question + exactly 4 options + correct_index (0–3) zaroori hai.'); return; }
    const out = arr.map((q) => ({ id: newId(), subject_id: subjectId, lecture_no: q.lecture_no ?? null, question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation || '' }));
    const res = await tpSupabase.from('tp_mcqs').insert(out);
    if (res.error) { setError(res.error.message); return; }
    setOk(`${out.length} MCQs imported.`); setJson(''); load(subjectId);
  };
  const remove = async (id) => {
    if (!window.confirm('Ye MCQ delete kar dein?')) return;
    const res = await tpSupabase.from('tp_mcqs').delete().eq('id', id);
    if (res.error) { setError(res.error.message); return; }
    load(subjectId);
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>MCQs</h3>
      <Msg error={error} ok={ok} />
      <label className="edx-exam-field">Subject<select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        {subjects.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
      </select></label>
      <form onSubmit={save}>
        <label className="edx-exam-field">Lecture no.<input type="number" value={form.lecture_no} onChange={(e) => setForm({ ...form, lecture_no: e.target.value })} /></label>
        <label className="edx-exam-field">Question<textarea rows={3} required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></label>
        {form.options.map((o, i) => (
          <label key={i} className="edx-exam-field">Option {['A', 'B', 'C', 'D'][i]}<input required value={o} onChange={(e) => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} /></label>
        ))}
        <label className="edx-exam-field">Correct option<select value={form.correct_index} onChange={(e) => setForm({ ...form, correct_index: e.target.value })}><option value={0}>A</option><option value={1}>B</option><option value={2}>C</option><option value={3}>D</option></select></label>
        <label className="edx-exam-field">Explanation<textarea rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></label>
        <div className="edx-exam-actions">
          <button type="submit" className="edx-exam-primary">{form.id ? 'Update MCQ' : 'Add MCQ'}</button>
          {form.id && <button type="button" className="edx-exam-secondary" onClick={() => setForm({ id: '', lecture_no: '', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' })}>Cancel edit</button>}
        </div>
      </form>
      <label className="edx-exam-field">Bulk JSON import (top-level array)<textarea rows={4} value={json} onChange={(e) => setJson(e.target.value)} placeholder='[{"question":"...","options":["a","b","c","d"],"correct_index":0,"explanation":"...","lecture_no":1}]' /></label>
      <div className="edx-exam-actions"><button type="button" className="edx-exam-secondary" onClick={importJson}>Import JSON</button></div>
      {!rows && <p role="status">Loading…</p>}
      {rows && rows.length === 0 && <p>Is subject ke liye koi MCQ nahi hai.</p>}
      {rows && rows.map((q) => (
        <div key={q.id} className="edx-exam-pending">
          <p><strong>Lecture {q.lecture_no}:</strong> {String(q.question).slice(0, 160)}</p>
          <div className="edx-exam-actions">
            <button type="button" className="edx-exam-secondary" onClick={() => setForm({ id: q.id, lecture_no: q.lecture_no ?? '', question: q.question, options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'].map((k) => q.options[k] || ''), correct_index: q.correct_index, explanation: q.explanation || '' })}>Edit</button>
            <button type="button" className="edx-exam-secondary" onClick={() => remove(q.id)}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function SubjTab({ subjects }) {
  const [kind, setKind] = useState('short');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ id: '', lecture_no: '', marks: 3, question: '', answer: '', table_json: '' });
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const table = kind === 'short' ? 'tp_short_questions' : 'tp_long_questions';
  const load = async (sid, t) => {
    const res = await tpSupabase.from(t).select('*').eq('subject_id', sid).order('lecture_no').order('created_at');
    if (res.error) { setError(res.error.message); return; }
    setRows(res.data || []);
  };
  useEffect(() => { if (subjectId) load(subjectId, table); }, [subjectId, kind]);
  useEffect(() => { if (!subjectId && subjects[0]) setSubjectId(subjects[0].id); }, [subjects]);
  const save = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    let tableJson = null;
    if (form.table_json.trim()) {
      try { tableJson = JSON.parse(form.table_json); } catch (_) { setError('table_json valid JSON nahi hai.'); return; }
    }
    const row = { subject_id: subjectId, lecture_no: form.lecture_no === '' ? null : Number(form.lecture_no), marks: Number(form.marks), question: form.question, answer: form.answer, table_json: tableJson };
    const res = form.id
      ? await tpSupabase.from(table).update(row).eq('id', form.id)
      : await tpSupabase.from(table).insert({ id: newId(), ...row });
    if (res.error) { setError(res.error.message); return; }
    setOk('Question saved.'); setForm({ id: '', lecture_no: '', marks: kind === 'short' ? 3 : 5, question: '', answer: '', table_json: '' }); load(subjectId, table);
  };
  const importJson = async () => {
    setError(''); setOk('');
    let arr;
    try { arr = JSON.parse(json); } catch (_) { setError('JSON parse nahi hua. Top-level array chahiye.'); return; }
    if (!Array.isArray(arr)) { setError('Top-level array chahiye.'); return; }
    const bad = arr.find((q) => !q.question || !q.answer);
    if (bad) { setError('Har item mein question + answer zaroori hai.'); return; }
    const out = arr.map((q) => ({ id: newId(), subject_id: subjectId, lecture_no: q.lecture_no ?? null, marks: q.marks ?? (kind === 'short' ? 3 : 5), question: q.question, answer: q.answer, table_json: q.table_json || q.table || null }));
    const res = await tpSupabase.from(table).insert(out);
    if (res.error) { setError(res.error.message); return; }
    setOk(`${out.length} questions imported.`); setJson(''); load(subjectId, table);
  };
  const remove = async (id) => {
    if (!window.confirm('Ye question delete kar dein?')) return;
    const res = await tpSupabase.from(table).delete().eq('id', id);
    if (res.error) { setError(res.error.message); return; }
    load(subjectId, table);
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Subjective questions</h3>
      <Msg error={error} ok={ok} />
      <div className="edx-exam-form-grid">
        <label className="edx-exam-field">Kind<select value={kind} onChange={(e) => { setKind(e.target.value); setForm((f) => ({ ...f, marks: e.target.value === 'short' ? 3 : 5 })); }}><option value="short">Short (3 marks)</option><option value="long">Long (5 marks)</option></select></label>
        <label className="edx-exam-field">Subject<select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
        </select></label>
      </div>
      <form onSubmit={save}>
        <div className="edx-exam-form-grid">
          <label className="edx-exam-field">Lecture no.<input type="number" value={form.lecture_no} onChange={(e) => setForm({ ...form, lecture_no: e.target.value })} /></label>
          <label className="edx-exam-field">Marks<input type="number" required value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} /></label>
        </div>
        <label className="edx-exam-field">Question<textarea rows={3} required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></label>
        <label className="edx-exam-field">Model answer<textarea rows={4} required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></label>
        <label className="edx-exam-field">Truth table JSON (optional)<textarea rows={2} value={form.table_json} onChange={(e) => setForm({ ...form, table_json: e.target.value })} placeholder='{"headers":[...],"rows":[[...]]}' /></label>
        <div className="edx-exam-actions">
          <button type="submit" className="edx-exam-primary">{form.id ? 'Update question' : 'Add question'}</button>
          {form.id && <button type="button" className="edx-exam-secondary" onClick={() => setForm({ id: '', lecture_no: '', marks: kind === 'short' ? 3 : 5, question: '', answer: '', table_json: '' })}>Cancel edit</button>}
        </div>
      </form>
      <label className="edx-exam-field">Bulk JSON import (top-level array)<textarea rows={4} value={json} onChange={(e) => setJson(e.target.value)} placeholder='[{"question":"...","answer":"...","marks":3,"lecture_no":1}]' /></label>
      <div className="edx-exam-actions"><button type="button" className="edx-exam-secondary" onClick={importJson}>Import JSON</button></div>
      {!rows && <p role="status">Loading…</p>}
      {rows && rows.length === 0 && <p>Koi question nahi hai.</p>}
      {rows && rows.map((q) => (
        <div key={q.id} className="edx-exam-pending">
          <p><strong>Lecture {q.lecture_no} ({q.marks} marks):</strong> {String(q.question).slice(0, 160)}</p>
          <div className="edx-exam-actions">
            <button type="button" className="edx-exam-secondary" onClick={() => setForm({ id: q.id, lecture_no: q.lecture_no ?? '', marks: q.marks, question: q.question, answer: q.answer, table_json: q.table_json ? JSON.stringify(q.table_json) : '' })}>Edit</button>
            <button type="button" className="edx-exam-secondary" onClick={() => remove(q.id)}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ProgressTab({ adminEmail }) {
  const [profiles, setProfiles] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [open, setOpen] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [adminMarks, setAdminMarks] = useState({});
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const load = async () => {
    const [p, a] = await Promise.all([
      tpSupabase.from('tp_profiles').select('id, email').order('email'),
      tpSupabase.from('tp_attempts').select('*').order('created_at', { ascending: false }),
    ]);
    if (!p.error) setProfiles(p.data || []);
    if (!a.error) setAttempts(a.data || []);
    if (p.error || a.error) setError(`Could not load progress: ${p.error?.message || a.error?.message}`);
  };
  useEffect(() => { load(); }, []);
  const emailOf = (uid) => (profiles || []).find((p) => p.id === uid)?.email || `User ${String(uid).slice(0, 8)}…`;
  const openReview = async (attempt) => {
    setOpen(attempt); setQuestions(null); setAdminMarks((attempt.review && attempt.review.marks) || {}); setFeedback((attempt.review && attempt.review.feedback) || '');
    if (attempt.type === 'mcq') {
      const res = await tpSupabase.from('tp_mcqs').select('*').eq('subject_id', attempt.subject_id).order('lecture_no');
      setQuestions(res.error ? [] : res.data || []);
    } else {
      const [s, l] = await Promise.all([
        tpSupabase.from('tp_short_questions').select('*').eq('subject_id', attempt.subject_id),
        tpSupabase.from('tp_long_questions').select('*').eq('subject_id', attempt.subject_id),
      ]);
      setQuestions([...(s.data || []).map((q) => ({ ...q, kind: 'Short' })), ...(l.data || []).map((q) => ({ ...q, kind: 'Long' }))]);
    }
  };
  const saveReview = async () => {
    if (!open || !questions) return;
    const marks = {};
    let total = 0;
    for (const q of questions) {
      const max = q.marks == null ? 100 : q.marks;
      const v = Number(adminMarks[q.id]);
      if (!Number.isInteger(v) || v < 0 || v > max) { setError(`Marks for "${String(q.question).slice(0, 40)}…" must be a whole number from 0 to ${max}.`); return; }
      marks[q.id] = v; total += v;
    }
    setSaving(true); setError(''); setOk('');
    const res = await tpSupabase.from('tp_attempts').update({
      admin_score: total, status: 'reviewed',
      review: { ...(open.review || {}), marks, feedback, reviewer: adminEmail, reviewed_at: new Date().toISOString() },
    }).eq('id', open.id);
    setSaving(false);
    if (res.error) {
      if (/column/i.test(res.error.message)) setError('Review columns missing hain — combined move file (review part) Supabase SQL editor mein run karein.');
      else setError(res.error.message);
      return;
    }
    setOk('Teacher review saved.'); load();
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Progress &amp; attempts</h3>
      <Msg error={error} ok={ok} />
      {!attempts && <p role="status">Loading…</p>}
      {attempts && attempts.length === 0 && <p>Koi attempt nahi hai.</p>}
      {attempts && attempts.map((a) => (
        <div key={a.id} className="edx-exam-pending">
          <p><strong>{emailOf(a.user_id)}</strong> · {a.subject_code} · {a.type} · {a.score}/{a.total} · {new Date(a.created_at).toLocaleString()} · {a.status || 'submitted'}{a.admin_score != null ? ` · teacher: ${a.admin_score}` : ''}</p>
          <div className="edx-exam-actions"><button type="button" className="edx-exam-secondary" onClick={() => openReview(a)}>Review</button></div>
        </div>
      ))}
      {open && (
        <div className="edx-exam-pending">
          <h4>Review: {emailOf(open.user_id)} · {open.subject_code} · {open.type}</h4>
          {!questions && <p role="status">Loading questions…</p>}
          {questions && open.type !== 'mcq' && questions.map((q) => (
            <label key={q.id} className="edx-exam-field">{q.kind} · {String(q.question).slice(0, 100)} (max {q.marks})
              <input type="number" min={0} max={q.marks} value={adminMarks[q.id] ?? ''} onChange={(e) => setAdminMarks((m) => ({ ...m, [q.id]: e.target.value }))} />
            </label>
          ))}
          {questions && open.type === 'mcq' && <p>MCQ attempt — score {open.score}/{open.total} (auto-graded). Teacher review sirf subjective attempts par hoti hai.</p>}
          <label className="edx-exam-field">Feedback<textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></label>
          <div className="edx-exam-actions">
            {open.type !== 'mcq' && <button type="button" className="edx-exam-primary" disabled={saving} onClick={saveReview}>Save teacher review</button>}
            <button type="button" className="edx-exam-secondary" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}

function UsersTab() {
  const [profiles, setProfiles] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [reason, setReason] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const load = async () => {
    const [p, a, b, ad] = await Promise.all([
      tpSupabase.from('tp_profiles').select('id, email').order('email'),
      tpSupabase.from('tp_attempts').select('*').order('created_at', { ascending: false }),
      tpSupabase.from('tp_blocked').select('*'),
      tpSupabase.from('tp_admins').select('email'),
    ]);
    if (!p.error) setProfiles(p.data || []);
    if (!a.error) setAttempts(a.data || []);
    if (!b.error) setBlocked(b.data || []);
    if (!ad.error) setAdmins((ad.data || []).map((r) => r.email));
  };
  useEffect(() => { load(); }, []);
  const isBlocked = (uid) => blocked.find((b) => b.user_id === uid);
  const toggleBlock = async (uid, email) => {
    setError(''); setOk('');
    const b = isBlocked(uid);
    const res = b
      ? await tpSupabase.from('tp_blocked').delete().eq('user_id', uid)
      : await tpSupabase.from('tp_blocked').insert({ user_id: uid, reason: reason[uid] || '', blocked_by: '' });
    if (res.error) { setError(res.error.message); return; }
    setOk(b ? `${email} unblocked.` : `${email} blocked.`); load();
  };
  const toggleAdmin = async (email) => {
    if (email === TP_ROOT_ADMIN) return;
    setError(''); setOk('');
    const has = admins.includes(email);
    const res = has
      ? await tpSupabase.from('tp_admins').delete().eq('email', email)
      : await tpSupabase.from('tp_admins').insert({ email });
    if (res.error) { setError(res.error.message); return; }
    setOk(has ? `${email} admin se hataya gaya.` : `${email} admin bana diya gaya.`); load();
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Users</h3>
      <Msg error={error} ok={ok} />
      <p className="edx-paper-note">Auth account delete Supabase dashboard se hi hota hai (anon key se nahi) — is liye yahan sirf block/unblock aur admin banane/hatane ke options hain.</p>
      {!profiles && <p role="status">Loading…</p>}
      {profiles && profiles.map((p) => {
        const mine = (attempts || []).filter((a) => a.user_id === p.id);
        const best = mine.length ? Math.max(...mine.map((a) => a.total ? Math.round((a.score / a.total) * 100) : 0)) : 0;
        const last = mine.length ? new Date(mine[0].created_at).toLocaleString() : '—';
        const b = isBlocked(p.id);
        return (
          <div key={p.id} className="edx-exam-pending">
            <p><strong>{p.email}</strong> · {mine.length} attempts · best {best}% · last {last}{b ? ` · BLOCKED (${b.reason || 'no reason'})` : ''}{admins.includes(p.email) ? ' · admin' : ''}</p>
            <div className="edx-exam-actions">
              {!b && <input value={reason[p.id] || ''} onChange={(e) => setReason((r) => ({ ...r, [p.id]: e.target.value }))} placeholder="Block reason (optional)" />}
              <button type="button" className="edx-exam-secondary" onClick={() => toggleBlock(p.id, p.email)}>{b ? 'Unblock' : 'Block'}</button>
              {p.email !== TP_ROOT_ADMIN && <button type="button" className="edx-exam-secondary" onClick={() => toggleAdmin(p.email)}>{admins.includes(p.email) ? 'Remove admin' : 'Make admin'}</button>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SettingsTab() {
  const [form, setForm] = useState({ access_code: '', site_title: '', site_tagline: '', signup_open: true });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  useEffect(() => {
    (async () => {
      const res = await tpSupabase.from('tp_settings').select('key,value');
      if (res.error) { setError(res.error.message); return; }
      const m = {};
      (res.data || []).forEach((r) => { m[r.key] = r.value; });
      setForm({ access_code: m.access_code || '', site_title: m.site_title || '', site_tagline: m.site_tagline || '', signup_open: m.signup_open !== 'false' });
    })();
  }, []);
  const save = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    const rows = [
      { key: 'access_code', value: form.access_code.trim() },
      { key: 'site_title', value: form.site_title },
      { key: 'site_tagline', value: form.site_tagline },
      { key: 'signup_open', value: form.signup_open ? 'true' : 'false' },
    ];
    const res = await tpSupabase.from('tp_settings').upsert(rows, { onConflict: 'key' });
    if (res.error) { setError(res.error.message); return; }
    setOk('Settings saved.');
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Settings</h3>
      <Msg error={error} ok={ok} />
      <form onSubmit={save}>
        <label className="edx-exam-field">Access code<input required value={form.access_code} onChange={(e) => setForm({ ...form, access_code: e.target.value })} /></label>
        <label className="edx-exam-field">Site title<input value={form.site_title} onChange={(e) => setForm({ ...form, site_title: e.target.value })} /></label>
        <label className="edx-exam-field">Site tagline<input value={form.site_tagline} onChange={(e) => setForm({ ...form, site_tagline: e.target.value })} /></label>
        <label className="edx-exam-consent"><input type="checkbox" checked={form.signup_open} onChange={(e) => setForm({ ...form, signup_open: e.target.checked })} /> New signups open</label>
        <div className="edx-exam-actions"><button type="submit" className="edx-exam-primary">Save settings</button></div>
      </form>
    </section>
  );
}

function AdminsTab() {
  const [list, setList] = useState(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const load = async () => {
    const res = await tpSupabase.from('tp_admins').select('email').order('email');
    if (res.error) { setError(res.error.message); return; }
    setList((res.data || []).map((r) => r.email));
  };
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    const res = await tpSupabase.from('tp_admins').insert({ email: email.trim() });
    if (res.error) { setError(res.error.message); return; }
    setOk(`${email.trim()} admin bana diya gaya.`); setEmail(''); load();
  };
  const remove = async (em) => {
    if (em === TP_ROOT_ADMIN) return;
    if (!window.confirm(`${em} ko admin se hatayein?`)) return;
    const res = await tpSupabase.from('tp_admins').delete().eq('email', em);
    if (res.error) { setError(res.error.message); return; }
    setOk(`${em} admin se hataya gaya.`); load();
  };
  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Admins</h3>
      <Msg error={error} ok={ok} />
      <p className="edx-paper-note">Root admin ({TP_ROOT_ADMIN}) hamesha admin rehta hai — use hataya nahi ja sakta.</p>
      <form onSubmit={add}>
        <label className="edx-exam-field">Add admin email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <div className="edx-exam-actions"><button type="submit" className="edx-exam-primary">Add admin</button></div>
      </form>
      {!list && <p role="status">Loading…</p>}
      {list && list.map((em) => (
        <div key={em} className="edx-exam-pending">
          <p><strong>{em}</strong>{em === TP_ROOT_ADMIN ? ' (root)' : ''}</p>
          {em !== TP_ROOT_ADMIN && <div className="edx-exam-actions"><button type="button" className="edx-exam-secondary" onClick={() => remove(em)}>Remove admin</button></div>}
        </div>
      ))}
    </section>
  );
}
