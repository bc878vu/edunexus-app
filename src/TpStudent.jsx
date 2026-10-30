// src/TpStudent.jsx — Course Tests (login-gated) inside EduNexus.
// Student side, full: Supabase login/signup (access-code gated) + subjects
// with live counts + MCQ engine + subjective engine + my attempts/stats.
// MCQ answers lock per question with instant feedback (the course-test
// engine's design); subjective answers are plain text.

import React, { useEffect, useMemo, useState } from 'react';
import { getTpSession, onTpAuthChange, signInTp, signOutTp, signUpTp, loadTpContent, readTpSettings, fetchTpMyAttempts, fetchTpBlocked, saveTpAttempt } from './db/tpCourse';
import { TpTex, TpTruthTable, normalizeTpQuestion } from './TpTex';

const LETTERS = ['A', 'B', 'C', 'D'];
function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
  const [blocked, setBlocked] = useState(null);
  const [view, setView] = useState('subjects');
  const [activeSubject, setActiveSubject] = useState(null);
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    let live = true;
    getTpSession().then((s) => { if (live) setSession(s); });
    const off = onTpAuthChange((s) => { if (live) setSession(s); });
    readTpSettings().then((st) => { if (live) setSignupOpen(st.signup_open); });
    return () => { live = false; off(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setContent(null); setBlocked(null); setAttempts(null); return; }
    let live = true;
    loadTpContent().then((c) => { if (live) setContent(c); }).catch((e) => { if (live) setError(e.message); });
    fetchTpBlocked(session.user.id).then((b) => { if (live) setBlocked(b); });
    fetchTpMyAttempts(session.user.id).then((a) => { if (live) setAttempts(a); });
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

  const openTest = (kind, subject) => { setActiveSubject(subject); setView(kind); };
  const backToSubjects = () => {
    setView('subjects'); setActiveSubject(null);
    if (session?.user) fetchTpMyAttempts(session.user.id).then(setAttempts);
  };

  if (!session) {
    return (
      <div className="edx-exam-stack">
        <section className="edx-paper-cover">
          <h1>Course Tests</h1>
          <p>Login-gated midterm practice — lectures 1–22. Sirf access code wale students test de sakte hain.</p>
        </section>
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
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="edx-exam-stack">
        <section className="edx-paper-cover"><h1>Course Tests</h1></section>
        <section className="edx-exam-card" role="alert">
          <h2>Account blocked</h2>
          <p>Aap ka account admin ne block kar diya hai{blocked.reason ? ` — wajah: ${blocked.reason}` : ''}. Test dene ke liye admin se contact karein.</p>
          <div className="edx-exam-actions"><button type="button" className="edx-exam-secondary" onClick={() => signOutTp()}>Log out</button></div>
        </section>
      </div>
    );
  }

  if (view === 'mcq' && activeSubject) {
    return <McqEngine user={session.user} subject={activeSubject} mcqs={content.mcqs.filter((m) => m.subject_id === activeSubject.id).map(normalizeTpQuestion)} onDone={backToSubjects} />;
  }
  if (view === 'subj' && activeSubject) {
    return <SubjEngine user={session.user} subject={activeSubject} shorts={content.shorts.filter((q) => q.subject_id === activeSubject.id).map(normalizeTpQuestion)} longs={content.longs.filter((q) => q.subject_id === activeSubject.id).map(normalizeTpQuestion)} onDone={backToSubjects} />;
  }
  if (view === 'stats') {
    return (
      <div className="edx-exam-stack">
        <button type="button" className="edx-exam-secondary" onClick={backToSubjects}>← Back to subjects</button>
        <section className="edx-paper-cover"><h1>My attempts</h1><p>Aap ke tamam test attempts aur teacher review.</p></section>
        {!attempts && <section className="edx-exam-card" role="status">Loading…</section>}
        {attempts && attempts.length === 0 && <section className="edx-exam-card"><p>Abhi koi attempt nahi hai.</p></section>}
        {attempts && attempts.map((a) => (
          <article key={a.id} className="edx-exam-card">
            <h3>{a.subject_code} — {a.type === 'mcq' ? 'MCQ' : 'Subjective'}</h3>
            <p>Score: {a.score} / {a.total} · {new Date(a.created_at).toLocaleString()}</p>
            {a.review && <p>Teacher review: {a.status === 'reviewed' ? `reviewed, admin score ${a.admin_score ?? ''}` : 'submitted, review pending'}{a.review.feedback ? ` — ${a.review.feedback}` : ''}</p>}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="edx-exam-stack">
      <section className="edx-paper-cover">
        <h1>Course Tests</h1>
        <p>Login-gated midterm practice — lectures 1–22. Sirf access code wale students test de sakte hain.</p>
      </section>
      <section className="edx-exam-card">
        <div className="edx-exam-between">
          <p style={{ margin: 0 }}>Logged in as <strong>{session.user.email}</strong></p>
          <div className="edx-exam-actions" style={{ marginTop: 0 }}>
            <button type="button" className="edx-exam-secondary" onClick={() => setView('stats')}>My attempts</button>
            <button type="button" className="edx-exam-secondary" onClick={() => signOutTp()}>Log out</button>
          </div>
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
            <div className="edx-exam-actions">
              <button type="button" className="edx-exam-primary" disabled={mcqs === 0} onClick={() => openTest('mcq', s)}>MCQ Test</button>
              <button type="button" className="edx-exam-secondary" disabled={shorts + longs === 0} onClick={() => openTest('subj', s)}>Subjective Test</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function McqEngine({ user, subject, mcqs, onDone }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [current, setCurrent] = useState(0);
  const [bookmarked, setBookmarked] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (submitted) return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);
  const answered = Object.keys(answers).length;
  const currentQ = mcqs[Math.min(current, mcqs.length - 1)];
  const score = useMemo(() => {
    if (!submitted) return null;
    return mcqs.reduce((n, q) => n + (answers[q.id] === q.correct_index ? 1 : 0), 0);
  }, [submitted, answers, mcqs]);

  async function submit() {
    const unanswered = mcqs.filter((q) => answers[q.id] === undefined).length;
    if (unanswered > 0) {
      const ok = window.confirm(`${unanswered} question(s) are unanswered and will count as wrong. Submit anyway?`);
      if (!ok) return;
    }
    const sc = mcqs.reduce((n, q) => n + (answers[q.id] === q.correct_index ? 1 : 0), 0);
    const wrongLectures = mcqs.filter((q) => answers[q.id] !== q.correct_index).map((q) => q.lecture_no).filter((n) => n !== null && n !== undefined);
    setSubmitted(true);
    try {
      await saveTpAttempt({ userId: user.id, subject, type: 'mcq', score: sc, total: mcqs.length, details: { wrong_lectures: wrongLectures, answers } });
      setSavedMsg('Attempt saved to your progress.');
    } catch (_) { setSavedMsg('Result shown (could not save attempt).'); }
  }

  if (mcqs.length === 0) {
    return (<div className="edx-exam-stack"><section className="edx-exam-card"><p>No MCQs for this subject yet.</p><button type="button" className="edx-exam-secondary" onClick={onDone}>Back</button></section></div>);
  }

  return (
    <div className="edx-exam-stack">
      <button type="button" className="edx-exam-secondary" onClick={onDone}>← Back to subjects</button>
      {!submitted && (
        <section className="edx-exam-card">
          <div className="edx-exam-between">
            <div><span className="edx-exam-eyebrow">Course Tests · MCQ Engine</span><h3 style={{ margin: '4px 0' }}>{subject.code} — {subject.name}</h3></div>
            <span><strong>{current + 1} of {mcqs.length}</strong></span>
          </div>
          <p className="edx-paper-meta-line">{answered} / {mcqs.length} answered · ⏱ {fmtTime(elapsed)}</p>
          <div className="edx-exam-progress"><span style={{ width: `${mcqs.length ? Math.round((answered / mcqs.length) * 100) : 0}%` }} /></div>
          <nav className="edx-paper-palette" aria-label="Question palette">
            {mcqs.map((q, qi) => {
              const mine = answers[q.id];
              let cls = '';
              if (qi === current) cls = 'current';
              else if (mine !== undefined) cls = 'answered';
              else if (bookmarked[qi]) cls = 'marked';
              return (<button key={q.id} type="button" className={cls} onClick={() => { setCurrent(qi); setShowExplanation(false); }}>{qi + 1}</button>);
            })}
          </nav>
        </section>
      )}
      {submitted && (
        <section className="edx-exam-card">
          <p className="edx-exam-score">{score} / {mcqs.length}</p>
          <p>{Math.round((score / mcqs.length) * 100)}% correct</p>
          <p className="edx-paper-meta-line">{savedMsg}</p>
        </section>
      )}
      {!submitted && (
        <section className="edx-exam-card edx-exam-question" aria-label={`Question ${current + 1}`}>
          <div className="edx-exam-between">
            <span className="edx-exam-eyebrow">Question #{current + 1}</span>
            <button type="button" className="edx-exam-secondary" onClick={() => setBookmarked((b) => ({ ...b, [current]: !b[current] }))}>
              {bookmarked[current] ? '★ Bookmarked' : '☆ Mark'}
            </button>
          </div>
          <h3><TpTex text={currentQ.question} /></h3>
          <p className="edx-paper-meta-line">Lecture {currentQ.lecture_no}</p>
          <div className="edx-exam-options">
            {currentQ.options.map((opt, oi) => {
              const mine = answers[currentQ.id];
              const answeredQ = mine !== undefined;
              let cls = 'edx-exam-option';
              if (answeredQ && oi === currentQ.correct_index) cls += ' correct';
              else if (answeredQ && oi === mine) cls += ' incorrect';
              return (
                <button key={oi} type="button" disabled={answeredQ} className={cls} onClick={() => setAnswers((a) => ({ ...a, [currentQ.id]: oi }))}>
                  <span>{LETTERS[oi]}</span>
                  <span><TpTex text={opt} /></span>
                </button>
              );
            })}
          </div>
          {answers[currentQ.id] !== undefined && (
            <p className="edx-exam-feedback" role="status">
              {answers[currentQ.id] === currentQ.correct_index ? '✓ Correct!' : (<>✗ Incorrect. Correct answer: {LETTERS[currentQ.correct_index]} — <TpTex text={currentQ.options[currentQ.correct_index]} />.</>)}
            </p>
          )}
          {answers[currentQ.id] !== undefined && currentQ.explanation && (
            <div>
              <button type="button" className="edx-exam-secondary" onClick={() => setShowExplanation((v) => !v)}>{showExplanation ? 'Hide Explanation ▲' : '💡 Show Instant Explanation ▼'}</button>
              {showExplanation && <p className="edx-exam-feedback"><strong>Explanation: </strong><TpTex text={currentQ.explanation} /></p>}
            </div>
          )}
          <div className="edx-exam-actions">
            <button type="button" className="edx-exam-secondary" onClick={() => { setCurrent((c) => Math.max(0, c - 1)); setShowExplanation(false); }} disabled={current === 0}>← Previous</button>
            <button type="button" className="edx-exam-primary" onClick={() => { setCurrent((c) => Math.min(mcqs.length - 1, c + 1)); setShowExplanation(false); }} disabled={current === mcqs.length - 1}>Next →</button>
          </div>
          <div className="edx-exam-actions"><button type="button" className="edx-exam-primary" onClick={submit}>Finish now · see my score</button></div>
        </section>
      )}
      {submitted && mcqs.map((q, qi) => {
        const mine = answers[q.id];
        return (
          <section key={q.id} className="edx-exam-card">
            <p><strong>Q{qi + 1}. <TpTex text={q.question} /></strong> <span className="edx-paper-meta-line">Lecture {q.lecture_no}</span></p>
            {q.options.map((opt, oi) => {
              let cls = 'edx-exam-option';
              if (oi === q.correct_index) cls += ' correct';
              else if (oi === mine) cls += ' incorrect';
              return (<div key={oi} className={cls}><span>{LETTERS[oi]}</span><span><TpTex text={opt} /></span>{oi === q.correct_index && <span> — correct</span>}{oi === mine && oi !== q.correct_index && <span> — your answer</span>}</div>);
            })}
            {q.explanation && <p className="edx-paper-meta-line"><TpTex text={q.explanation} /></p>}
          </section>
        );
      })}
      {submitted && <button type="button" className="edx-exam-secondary" onClick={onDone}>Back to subjects</button>}
    </div>
  );
}

function SubjEngine({ user, subject, shorts, longs, onDone }) {
  const all = [
    ...shorts.map((q) => ({ ...q, kind: 'Short' })),
    ...longs.map((q) => ({ ...q, kind: 'Long' })),
  ];
  const [written, setWritten] = useState({});
  const [revealed, setRevealed] = useState({});
  const [marks, setMarks] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const plainText = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const writtenCount = all.filter((q) => plainText(written[q.id]) !== '').length;
  useEffect(() => {
    if (submitted || timeLeft <= 0) return undefined;
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted, timeLeft]);

  async function submit() {
    const unmarked = all.filter((q) => !marks[q.id]).length;
    if (unmarked > 0) {
      const ok = window.confirm(`${unmarked} question(s) are not self-marked yet. Submit anyway?`);
      if (!ok) return;
    }
    const right = all.filter((q) => marks[q.id] === 'right').length;
    setSubmitted(true);
    try {
      await saveTpAttempt({ userId: user.id, subject, type: 'subjective', score: right, total: all.length, details: { marks, written } });
      setSavedMsg('Attempt saved to your progress.');
    } catch (_) { setSavedMsg('Result shown (could not save attempt).'); }
  }

  if (all.length === 0) {
    return (<div className="edx-exam-stack"><section className="edx-exam-card"><p>No subjective questions for this subject yet.</p><button type="button" className="edx-exam-secondary" onClick={onDone}>Back</button></section></div>);
  }

  const counts = submitted ? {
    right: all.filter((q) => marks[q.id] === 'right').length,
    partial: all.filter((q) => marks[q.id] === 'partial').length,
    wrong: all.filter((q) => marks[q.id] === 'wrong').length,
  } : null;
  const currentQ = all[Math.min(active, all.length - 1)];
  const timeUp = timeLeft <= 0;

  return (
    <div className="edx-exam-stack">
      <button type="button" className="edx-exam-secondary" onClick={onDone}>← Back to subjects</button>
      {!submitted && (
        <section className="edx-exam-card">
          <div className="edx-exam-between">
            <div><span className="edx-exam-eyebrow">Course Tests · Subjective Paper</span><h3 style={{ margin: '4px 0' }}>{subject.code} — {subject.name}</h3></div>
            <span className={timeLeft < 300 && !timeUp ? 'edx-course-timer-low' : ''}>⏱ {timeUp ? 'Time up' : `Time Left: ${fmtTime(timeLeft)}`}</span>
          </div>
          <div className="edx-exam-actions"><button type="button" className="edx-exam-primary" onClick={submit}>Final Submit 🚀</button></div>
        </section>
      )}
      {!submitted && timeUp && (
        <section className="edx-exam-card" role="alert"><p>Time is up. Your answers are still here — submit now to save this attempt.</p></section>
      )}
      {submitted && counts && (
        <section className="edx-exam-card">
          <p className="edx-exam-score">{counts.right} right · {counts.partial} partial · {counts.wrong} wrong</p>
          <p>out of {all.length} questions</p>
          <p className="edx-paper-meta-line">Submitted to admin for review — teacher marks will appear in My attempts.</p>
          <p className="edx-paper-meta-line">{savedMsg}</p>
        </section>
      )}
      {!submitted && (
        <div className="edx-course-workspace">
          <aside className="edx-exam-card">
            <p className="edx-exam-eyebrow">Subjective Questions</p>
            <div className="edx-course-side-list">
              {all.map((q, qi) => {
                const answeredQ = plainText(written[q.id]) !== '';
                return (
                  <button key={q.id} type="button" className={`edx-course-side-btn${qi === active ? ' active' : ''}`} onClick={() => setActive(qi)}>
                    <span>Q.{qi + 1} ({q.marks} Marks)</span>
                    <span>{answeredQ ? '✅' : '⏳'}</span>
                  </button>
                );
              })}
            </div>
            <p className="edx-paper-meta-line">{writtenCount} / {all.length} written · {Object.keys(marks).length} / {all.length} self-marked</p>
          </aside>
          <div className="edx-exam-card edx-exam-question">
            <div className="edx-exam-between">
              <span className="edx-exam-eyebrow">Question #{active + 1}</span>
              <span className="edx-paper-meta-line">Marks: {currentQ.marks}</span>
            </div>
            <h3><TpTex text={currentQ.question} /></h3>
            <p className="edx-paper-meta-line">{currentQ.kind} · Lecture {currentQ.lecture_no}</p>
            <label className="edx-exam-field">Your answer (plain text)
              <textarea rows={8} value={written[currentQ.id] || ''} onChange={(e) => setWritten((w) => ({ ...w, [currentQ.id]: e.target.value }))} placeholder="Write your answer here…" />
            </label>
            {!revealed[currentQ.id] ? (
              <div className="edx-exam-actions"><button type="button" className="edx-exam-secondary" onClick={() => setRevealed((r) => ({ ...r, [currentQ.id]: true }))}>Show model answer</button></div>
            ) : (
              <div className="edx-exam-feedback">
                <p><strong>Model answer:</strong> <TpTex text={currentQ.answer} /></p>
                {currentQ.table && <TpTruthTable table={currentQ.table} />}
              </div>
            )}
            {revealed[currentQ.id] && !submitted && (
              <div className="edx-exam-actions">
                <span>Self-mark: </span>
                {['right', 'partial', 'wrong'].map((m) => (
                  <button key={m} type="button" className={marks[currentQ.id] === m ? 'edx-exam-primary' : 'edx-exam-secondary'} onClick={() => setMarks((x) => ({ ...x, [currentQ.id]: m }))}>{m}</button>
                ))}
              </div>
            )}
            <div className="edx-exam-actions">
              <button type="button" className="edx-exam-secondary" onClick={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0}>← Previous Question</button>
              <button type="button" className="edx-exam-primary" onClick={() => setActive((a) => Math.min(all.length - 1, a + 1))} disabled={active === all.length - 1}>Next Question →</button>
            </div>
          </div>
        </div>
      )}
      {submitted && (
        <div className="edx-exam-stack">
          {all.map((q, qi) => (
            <section key={q.id} className="edx-exam-card">
              <p><strong>Q{qi + 1} ({q.kind}, {q.marks} marks). <TpTex text={q.question} /></strong> <span className="edx-paper-meta-line">Lecture {q.lecture_no}</span></p>
              <p>Self-mark: <strong>{marks[q.id] || 'not marked'}</strong></p>
              <div className="edx-exam-feedback">
                <p><strong>Model answer:</strong> <TpTex text={q.answer} /></p>
                {q.table && <TpTruthTable table={q.table} />}
              </div>
            </section>
          ))}
          <button type="button" className="edx-exam-secondary" onClick={onDone}>Back to subjects</button>
        </div>
      )}
    </div>
  );
}
