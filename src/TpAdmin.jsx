// src/TpAdmin.jsx — Course Tests Admin, inside the EduNexus admin panel.
// Phase 1: Supabase login + admin check + live counts + subject list.
// Full management (subjects / MCQs / subjective / attempts / users /
// settings / admins) lands in the next phase, on top of this session
// foundation. Nothing here touches the separate vu-test site.

import React, { useEffect, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { getTpSession, onTpAuthChange, signInTp, signOutTp, isTpAdmin, tpCounts, listTpSubjects } from './db/tpCourse';

export default function TpAdmin({ user }) {
  const [session, setSession] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [counts, setCounts] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
        try {
          setCounts(await tpCounts());
          setSubjects(await listTpSubjects());
        } catch (e) { if (live) setError(e.message); }
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

  return (
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
      <h4>Subjects</h4>
      {subjects.length === 0 && <p>Koi subject nahi mila.</p>}
      {subjects.map((s) => (
        <p key={s.id}><strong>{s.code}</strong> — {s.name} · {s.term} · {s.scope}</p>
      ))}
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-secondary" onClick={refresh}>Refresh</button>
        <button type="button" className="edx-exam-secondary" onClick={() => signOutTp()}>Log out</button>
      </div>
      <p className="edx-paper-note">Agla step: subjects / MCQs / subjective / attempts / users / settings ka mukammal management isi section mein aayega.</p>
    </section>
  );
}
