// src/TpStudent.jsx — Course Tests (login-gated) inside EduNexus.
// Phase 2 slice 1: Supabase login/signup (access-code gated) + subject list
// with live counts from the EduNexus project's tp_* tables. The MCQ and
// subjective test engines land on this page in the next slice — there are
// deliberately no dead test buttons here yet.

import React, { useEffect, useState } from 'react';
import { getTpSession, onTpAuthChange, signInTp, signOutTp, signUpTp, loadTpContent, readTpSettings } from './db/tpCourse';

export default function TpStudent() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [signupOpen, setSignupOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [content, setContent] = useState(null);

  useEffect(() => {
    let live = true;
    getTpSession().then((s) => { if (live) setSession(s); });
    const off = onTpAuthChange((s) => { if (live) setSession(s); });
    readTpSettings().then((st) => { if (live) setSignupOpen(st.signup_open); });
    return () => { live = false; off(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setContent(null); return; }
    let live = true;
    loadTpContent().then((c) => { if (live) setContent(c); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [session]);

  const submitAuth = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      if (authMode === 'login') {
        await signInTp(email.trim(), password);
      } else {
        const data = await signUpTp(email.trim(), password, accessCode);
        if (!data.session) setMsg('Account ban gaya hai. Email confirm karein (inbox check karein), phir login karein.');
      }
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="edx-exam-stack">
      <section className="edx-paper-cover">
        <h1>Course Tests</h1>
        <p>Login-gated midterm practice — lectures 1–22. Sirf access code wale students test de sakte hain.</p>
      </section>
      {!session && (
        <section className="edx-exam-card edx-exam-form">
          <h2>{authMode === 'login' ? 'Login' : 'Signup'}</h2>
          <form onSubmit={submitAuth}>
            <label className="edx-exam-field">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="edx-exam-field">Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {authMode === 'signup' && (
              <label className="edx-exam-field">Access code (from the admin)<input required value={accessCode} onChange={(e) => setAccessCode(e.target.value)} /></label>
            )}
            {error && <p role="alert" className="edx-exam-alert">{error}</p>}
            {msg && <p role="status">{msg}</p>}
            <div className="edx-exam-actions">
              <button type="submit" className="edx-exam-primary" disabled={busy}>{authMode === 'login' ? 'Login' : 'Create account'}</button>
              <button type="button" className="edx-exam-secondary" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setMsg(''); }}>
                {authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
              </button>
            </div>
          </form>
          {!signupOpen && authMode === 'signup' && <p className="edx-paper-note">Signup abhi band hai (admin ne off ki hui hai).</p>}
        </section>
      )}
      {session && (
        <>
          <section className="edx-exam-card">
            <p>Logged in as <strong>{session.user.email}</strong></p>
            <div className="edx-exam-actions">
              <button type="button" className="edx-exam-secondary" onClick={() => signOutTp()}>Log out</button>
            </div>
          </section>
          {error && <p role="alert" className="edx-exam-alert">{error}</p>}
          {!content && <section className="edx-exam-card" role="status">Loading subjects…</section>}
          {content && content.subjects.length === 0 && (
            <section className="edx-exam-card"><p>Koi subject nahi mila. Admin se contact karein.</p></section>
          )}
          {content && content.subjects.map((s) => {
            const mcqs = content.mcqs.filter((m) => m.subject_id === s.id).length;
            const shorts = content.shorts.filter((q) => q.subject_id === s.id).length;
            const longs = content.longs.filter((q) => q.subject_id === s.id).length;
            return (
              <article key={s.id} className="edx-exam-card">
                <h3>{s.code} — {s.name}</h3>
                <p className="edx-paper-meta-line">{s.term} · {s.scope}</p>
                <p>{mcqs} MCQs · {shorts} short · {longs} long</p>
              </article>
            );
          })}
          <p className="edx-paper-note">MCQ aur subjective test engine agle step mein isi page par aayega.</p>
        </>
      )}
    </div>
  );
}
