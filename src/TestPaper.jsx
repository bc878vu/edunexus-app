// src/TestPaper.jsx — interactive test papers on EduNexus (student side).
//
// A paper is taken in the browser: cover -> one question at a time with a
// palette, a 90-minute countdown (warning only, never a forced submit) ->
// submit -> instant MCQ result + model answers for subjective questions.
// The finished attempt is saved for the teacher (Firestore paperAttempts,
// silent Firebase anonymous sign-in at submit time) and a copy is kept in
// this browser's localStorage so the student keeps their own result.
// Nothing here invents questions: paper content comes from testPapersData.js.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase-client';
import { TEST_PAPERS, getTestPaper, paperQuestionCount } from './testPapersData';
import { BANK_SUBJECTS } from './testPapersBank';
import PaperBuilder from './PaperBuilder';
import {
  submitPaperAttempt,
  getPaperAttempt,
} from './db/paperAttempts';

const LS_KEY = (slug) => 'edunexus:paper-attempt:' + slug;
const ADMIN_WHATSAPP = '923098851445';

function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function readSavedAttempt(slug) {
  try {
    const raw = window.localStorage.getItem(LS_KEY(slug));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

async function firebaseUid() {
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

function PaperCard({ paper, onStart }) {
  const total = paperQuestionCount(paper);
  return (
    <article className="edx-exam-card edx-paper-card">
      <div className="edx-paper-card-top">
        <span className="edx-paper-pill">{paper.code} | {paper.term}</span>
        <span className="edx-paper-lectures">{paper.lectures}</span>
      </div>
      <h3>{paper.code} — {paper.title}</h3>
      <p>{paper.scopeNote}</p>
      <ul className="edx-paper-meta">
        <li>{paper.mcqs.length} MCQs</li>
        <li>{paper.shorts.length} Short questions</li>
        <li>{paper.longs.length} Long questions</li>
        <li>{total} questions · {paper.marks.total} marks · {paper.minutes} minutes</li>
      </ul>
      <button type="button" className="edx-exam-primary" onClick={onStart}>Start paper</button>
    </article>
  );
}

export function PaperRunner({ paper, onBack }) {
  const total = paperQuestionCount(paper);
  const [started, setStarted] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentVuId, setStudentVuId] = useState('');
  const [coverError, setCoverError] = useState('');
  const [index, setIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [shortAnswers, setShortAnswers] = useState(() => Array(paper.shorts.length).fill(''));
  const [longAnswers, setLongAnswers] = useState(() => Array(paper.longs.length).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(paper.minutes * 60);
  const [paused, setPaused] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | failed
  const [savedAttempt, setSavedAttempt] = useState(() => readSavedAttempt(paper.slug));
  const timerRef = useRef(null);

  const attempted = useMemo(() => {
    let n = Object.keys(mcqAnswers).length;
    shortAnswers.forEach((a) => { if (a.trim()) n += 1; });
    longAnswers.forEach((a) => { if (a.trim()) n += 1; });
    return n;
  }, [mcqAnswers, shortAnswers, longAnswers]);

  useEffect(() => {
    if (!started || submitted || paused) return undefined;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timerRef.current);
          setTimeUp(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerRef.current);
  }, [started, submitted, paused]);

  // Best-effort refresh of teacher marks for a previous attempt on this device.
  useEffect(() => {
    if (!savedAttempt || !savedAttempt.attemptId || submitted) return;
    let cancelled = false;
    getPaperAttempt(savedAttempt.attemptId)
      .then((doc) => {
        if (!cancelled && doc && doc.status === 'reviewed') {
          const next = { ...savedAttempt, teacherMarks: doc.teacherMarks, teacherFeedback: doc.teacherFeedback, status: 'reviewed' };
          setSavedAttempt(next);
          try { window.localStorage.setItem(LS_KEY(paper.slug), JSON.stringify(next)); } catch (_) {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [paper.slug, savedAttempt, submitted]);

  const startPaper = () => {
    if (!studentName.trim() || !studentVuId.trim()) {
      setCoverError('Please enter your name and VU ID before starting.');
      return;
    }
    setCoverError('');
    setStarted(true);
  };

  const questionAt = (i) => {
    if (i < paper.mcqs.length) return { kind: 'mcq', num: i, data: paper.mcqs[i] };
    const s = i - paper.mcqs.length;
    if (s < paper.shorts.length) return { kind: 'short', num: s, data: paper.shorts[s] };
    return { kind: 'long', num: s - paper.shorts.length, data: paper.longs[s - paper.shorts.length] };
  };

  const current = questionAt(index);
  const partLabel = current.kind === 'mcq' ? 'Part A · MCQ' : current.kind === 'short' ? 'Part B · Short question' : 'Part C · Long question';
  const partMarks = current.kind === 'mcq' ? 1 : current.kind === 'short' ? 3 : 5;

  const mcqScore = useMemo(() => {
    let score = 0;
    paper.mcqs.forEach((q, i) => { if (mcqAnswers[i] === q.answer) score += 1; });
    return score;
  }, [paper, mcqAnswers]);

  const persistAttempt = async (result) => {
    setSaveState('saving');
    try {
      const uid = await firebaseUid();
      const id = await submitPaperAttempt({
        userId: uid,
        studentName: result.studentName,
        studentVuId: result.studentVuId,
        paperSlug: paper.slug,
        paperCode: paper.code,
        mcqAnswers: result.mcqAnswers,
        mcqScore: result.mcqScore,
        mcqTotal: paper.mcqs.length,
        shortAnswers: result.shortAnswers,
        longAnswers: result.longAnswers,
        // Custom (builder) papers are not in the registry, so the generated
        // paper travels with the attempt — otherwise the teacher could not
        // review its questions, correct answers or model answers.
        ...(paper.isCustom ? { paperSnapshot: {
          code: paper.code, term: paper.term, lectures: paper.lectures, marks: paper.marks,
          mcqs: paper.mcqs, shorts: paper.shorts, longs: paper.longs } } : {}),
      });
      const withId = { ...result, attemptId: id, status: 'submitted' };
      setSaveState('saved');
      setSavedAttempt(withId);
      try { window.localStorage.setItem(LS_KEY(paper.slug), JSON.stringify(withId)); } catch (_) {}
      return withId;
    } catch (_) {
      setSaveState('failed');
      return result;
    }
  };

  const handleSubmit = async () => {
    const unanswered = total - attempted;
    const ok = window.confirm(
      unanswered > 0
        ? 'You still have ' + unanswered + ' unanswered question(s). Submit anyway?'
        : 'Submit this paper? You cannot change answers after submitting.'
    );
    if (!ok) return;
    const result = {
      studentName: studentName.trim(),
      studentVuId: studentVuId.trim(),
      mcqAnswers,
      mcqScore,
      shortAnswers,
      longAnswers,
      submittedAt: new Date().toISOString(),
    };
    setSubmitted(result);
    await persistAttempt(result);
  };

  const handleRetake = () => {
    if (!window.confirm('Start this paper again? Your current answers on this screen will be cleared.')) return;
    setStarted(false);
    setIndex(0);
    setMcqAnswers({});
    setShortAnswers(Array(paper.shorts.length).fill(''));
    setLongAnswers(Array(paper.longs.length).fill(''));
    setSecondsLeft(paper.minutes * 60);
    setPaused(false);
    setTimeUp(false);
    setSubmitted(null);
    setSaveState('idle');
  };

  const shareText = submitted
    ? paper.code + ' ' + paper.lectures + ' Test Paper — Name: ' + submitted.studentName + ', VU ID: ' + submitted.studentVuId + ', MCQ score: ' + submitted.mcqScore + '/' + paper.mcqs.length + '. Full paper: ' + window.location.origin + '/test-papers/' + paper.slug
    : '';
  const whatsappUrl = 'https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(shareText);

  if (submitted) {
    const teacherTotal = submitted.teacherMarks
      ? Object.values(submitted.teacherMarks).reduce((a, b) => a + (Number(b) || 0), 0)
      : null;
    // Weak-lecture report: wrong MCQ answers grouped by first lecture tag.
    const weakMap = {};
    paper.mcqs.forEach((q, i) => {
      const lec = (q.lectures && q.lectures[0]) || null;
      if (!lec) return;
      weakMap[lec] = weakMap[lec] || { n: lec, wrong: 0, total: 0 };
      weakMap[lec].total += 1;
      if (submitted.mcqAnswers[i] !== q.answer) weakMap[lec].wrong += 1;
    });
    const weakLectures = Object.values(weakMap).filter((w) => w.wrong > 0).sort((a, b) => b.wrong - a.wrong || a.n - b.n);
    return (
      <div className="edx-exam-stack">
        <section className="edx-exam-card edx-paper-result">
          <h2>Paper submitted</h2>
          <p><strong>{submitted.studentName}</strong> · VU ID {submitted.studentVuId}</p>
          <p className="edx-paper-score">MCQ score: {submitted.mcqScore} / {paper.mcqs.length}</p>
          <p>{paper.lectures}</p>
          {weakLectures.length > 0 && (
            <p><strong>Focus lectures (most MCQ mistakes):</strong> {weakLectures.map((w) => 'Lecture ' + w.n + ' (' + w.wrong + '/' + w.total + ' wrong)').join(', ')} — revise these first.</p>
          )}
          {teacherTotal === null
            ? <p>Subjective answers are submitted to the teacher for review. Teacher marks will appear here after review.</p>
            : <p className="edx-paper-score">Teacher marks (subjective): {teacherTotal} / {paper.marks.short + paper.marks.long} · Total: {submitted.mcqScore + teacherTotal} / {paper.marks.total}</p>}
          {submitted.teacherFeedback && <p><strong>Teacher feedback:</strong> {submitted.teacherFeedback}</p>}
          {saveState === 'saving' && <p role="status">Saving your attempt for the teacher…</p>}
          {saveState === 'saved' && <p role="status">Saved for the teacher. Receipt: {savedAttempt && savedAttempt.attemptId ? savedAttempt.attemptId.slice(0, 8) : ''}</p>}
          {saveState === 'failed' && (
            <p role="alert" className="edx-exam-alert">
              Your result below is correct, but it could not be saved for the teacher yet. Please try saving again.
              <button type="button" className="edx-exam-secondary" onClick={() => persistAttempt(submitted)}>Save again</button>
            </p>
          )}
          <div className="edx-exam-actions">
            <a className="edx-exam-primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Send result to EduNexus (WhatsApp)</a>
            <button type="button" className="edx-exam-secondary" onClick={handleRetake}>Retake paper</button>
            <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to Test Papers</button>
          </div>
        </section>
        <section className="edx-exam-card">
          <h3>MCQ review</h3>
          {paper.mcqs.map((q, i) => {
            const mine = submitted.mcqAnswers[i];
            const correct = mine === q.answer;
            return (
              <div key={i} className="edx-paper-review-row">
                <p><strong>Q{i + 1}{q.lectures ? ' (Lecture ' + q.lectures.join('/') + ')' : ''}.</strong> {q.q}</p>
                <p>Your answer: {mine ? mine + '. ' + (q.options.find((o) => o.letter === mine) || {}).text : 'Not answered'} — {correct ? 'Correct' : 'Wrong'}</p>
                {!correct && <p>Correct answer: {q.answer}. {(q.options.find((o) => o.letter === q.answer) || {}).text}</p>}
                <p className="edx-paper-explanation">{q.explanation}</p>
              </div>
            );
          })}
        </section>
        <section className="edx-exam-card">
          <h3>Subjective answers vs model answers</h3>
          {paper.shorts.map((q, i) => (
            <div key={'s' + i} className="edx-paper-review-row">
              <p><strong>Short Q{i + 1}.</strong> {q.q}</p>
              <p><strong>Your answer:</strong></p>
              <p className="edx-paper-answer-text">{submitted.shortAnswers[i] || 'Not answered'}</p>
              <p><strong>Model answer:</strong></p>
              <p className="edx-paper-answer-text">{q.modelAnswer}</p>
            </div>
          ))}
          {paper.longs.map((q, i) => (
            <div key={'l' + i} className="edx-paper-review-row">
              <p><strong>Long Q{i + 1}.</strong> {q.q}</p>
              <p><strong>Your answer:</strong></p>
              <p className="edx-paper-answer-text">{submitted.longAnswers[i] || 'Not answered'}</p>
              <p><strong>Model answer:</strong></p>
              <p className="edx-paper-answer-text">{q.modelAnswer}</p>
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="edx-exam-stack">
        <section className="edx-paper-cover">
          <div className="edx-paper-cover-top">
            <span className="edx-paper-brand">EduNexus</span>
            <span className="edx-paper-cover-tag">STUDY MATERIAL / EXAM PREP</span>
          </div>
          <span className="edx-paper-pill">{paper.code} | {paper.term}</span>
          <h1>{paper.code} — {paper.title} — Test Paper</h1>
          <p>{paper.lectures} · {paper.mcqs.length} MCQs · {paper.shorts.length} Short · {paper.longs.length} Long · {paper.marks.total} marks · {paper.minutes} minutes</p>
          <div className="edx-paper-cover-card">
            <strong>Inside this paper</strong>
            <p>{paper.scopeNote}</p>
            <p>{paper.sourceNote}</p>
          </div>
        </section>
        <section className="edx-exam-card edx-exam-form">
          <h3>Your details</h3>
          <p>Your name and VU ID are shown to the teacher with your attempt. Your answers are never shown to other students.</p>
          <label className="edx-exam-field">Name<input maxLength={80} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Your full name" /></label>
          <label className="edx-exam-field">VU ID<input maxLength={40} value={studentVuId} onChange={(e) => setStudentVuId(e.target.value)} placeholder="e.g. BC230400878" /></label>
          {coverError && <p role="alert" className="edx-exam-alert">{coverError}</p>}
          <button type="button" className="edx-exam-primary" onClick={startPaper}>Start paper ({paper.minutes} minutes)</button>
          <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to Test Papers</button>
        </section>
        {savedAttempt && (
          <section className="edx-exam-card">
            <h3>Your last attempt on this device</h3>
            <p>{savedAttempt.studentName} · VU ID {savedAttempt.studentVuId} · MCQ {savedAttempt.mcqScore}/{paper.mcqs.length}
              {savedAttempt.status === 'reviewed' && savedAttempt.teacherMarks ? ' · Teacher marks received' : ' · Submitted to teacher'}</p>
            <button type="button" className="edx-exam-secondary" onClick={() => setSubmitted(savedAttempt)}>View last result</button>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="edx-exam-stack">
      <div className="edx-paper-stickybar" role="status">
        <span>{attempted} of {total} attempted</span>
        <span className={secondsLeft < 300 ? 'edx-paper-timer-low' : ''}>⏱ {fmtTime(secondsLeft)}</span>
        <button type="button" className="edx-exam-secondary" onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" className="edx-exam-primary" onClick={handleSubmit}>Finish &amp; submit</button>
      </div>
      {timeUp && <p role="alert" className="edx-exam-alert">Time is up. You can still submit your paper.</p>}
      <nav className="edx-paper-palette" aria-label="Question palette">
        {Array.from({ length: total }, (_, i) => {
          const q = questionAt(i);
          const answered = q.kind === 'mcq'
            ? mcqAnswers[q.num] !== undefined
            : q.kind === 'short' ? Boolean(shortAnswers[q.num].trim()) : Boolean(longAnswers[q.num].trim());
          return (
            <button
              key={i}
              type="button"
              className={(index === i ? 'current ' : '') + (answered ? 'answered' : '')}
              aria-current={index === i ? 'true' : undefined}
              aria-label={'Question ' + (i + 1) + (answered ? ' (answered)' : '')}
              onClick={() => setIndex(i)}
            >{i + 1}</button>
          );
        })}
      </nav>
      <section className="edx-exam-card">
        <p><span className="edx-paper-part">{partLabel}</span> · {partMarks} mark{partMarks > 1 ? 's' : ''}</p>
        <h3>Q{index + 1}. {current.data.q}</h3>
        {current.kind === 'mcq' && (
          <div className="edx-paper-options">
            {current.data.options.map((o) => (
              <button
                key={o.letter}
                type="button"
                className={mcqAnswers[current.num] === o.letter ? 'selected' : ''}
                aria-pressed={mcqAnswers[current.num] === o.letter}
                onClick={() => setMcqAnswers((prev) => ({ ...prev, [current.num]: o.letter }))}
              ><strong>{o.letter}.</strong> {o.text}</button>
            ))}
          </div>
        )}
        {current.kind === 'short' && (
          <label className="edx-exam-field">Your answer<textarea rows={6} maxLength={2000} value={shortAnswers[current.num]} onChange={(e) => setShortAnswers((prev) => prev.map((v, j) => (j === current.num ? e.target.value : v)))} placeholder="Type your answer here…" /></label>
        )}
        {current.kind === 'long' && (
          <label className="edx-exam-field">Your answer<textarea rows={12} maxLength={6000} value={longAnswers[current.num]} onChange={(e) => setLongAnswers((prev) => prev.map((v, j) => (j === current.num ? e.target.value : v)))} placeholder="Type your answer here…" /></label>
        )}
        <div className="edx-exam-actions">
          <button type="button" className="edx-exam-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
          {index < total - 1
            ? <button type="button" className="edx-exam-primary" onClick={() => setIndex(index + 1)}>Next</button>
            : <button type="button" className="edx-exam-primary" onClick={handleSubmit}>Finish &amp; submit</button>}
        </div>
      </section>
    </div>
  );
}

export default function TestPapersHome({ paperSlug, onSelectPaper }) {
  const [builderCode, setBuilderCode] = useState(null);
  const paper = paperSlug ? getTestPaper(paperSlug) : null;
  if (paper) return <PaperRunner paper={paper} onBack={() => onSelectPaper('')} />;
  if (builderCode) return <PaperBuilder subjectCode={builderCode} onBack={() => setBuilderCode(null)} />;
  return (
    <div className="edx-exam-stack">
      <section className="edx-paper-cover">
        <div className="edx-paper-cover-top">
          <span className="edx-paper-brand">EduNexus</span>
          <span className="edx-paper-cover-tag">STUDY MATERIAL / EXAM PREP</span>
        </div>
        <h1>Test Papers</h1>
        <p>Full papers, taken online. MCQs are checked instantly; subjective answers go to the teacher for marks.</p>
        <div className="edx-paper-cover-card">
          <strong>How it works</strong>
          <p>Open a paper, enter your name and VU ID, answer every question, then submit. Your MCQ score shows immediately. Your subjective answers are saved for the teacher — other students never see them.</p>
        </div>
      </section>
      <section className="edx-exam-card">
        <h2>Build your own paper (Intelligent)</h2>
        <p>Choose a subject, tick the lectures you want, and get a paper built only from verified questions for those lectures — most-repeated concepts first, balanced across lectures, never padded with guesses.</p>
        {BANK_SUBJECTS.map((s) => (
          <div key={s.code} className="edx-exam-actions">
            <span><strong>{s.code}</strong> — {s.title} ({s.term}, {s.scope}): {s.bank.mcqs.length} MCQs + {s.bank.shorts.length} shorts + {s.bank.longs.length} longs, lecture-mapped</span>
            <button type="button" className="edx-exam-primary" onClick={() => setBuilderCode(s.code)}>Build custom paper</button>
          </div>
        ))}
      </section>
      {TEST_PAPERS.map((p) => (
        <PaperCard key={p.slug} paper={p} onStart={() => onSelectPaper(p.slug)} />
      ))}
    </div>
  );
}
