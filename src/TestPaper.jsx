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
import { SUBJECT_CATALOG, SUBJECT_STATUS_NOTE, subjectPrefix, categoryName } from './testPaperSubjects';
import { SITE } from './site-seo.mjs';
import { BANK_SUBJECTS, buildPaper } from './testPapersBank';
import { mergeBankSubjects, mergeCatalog } from './testPaperBankMerge';
import { useAdminBanks } from './useAdminBanks';
import { listSavedPapers, listAssignments } from './db/testPaperAdmin.js';
import { paperShareUrl, savedPaperUrl, PaperShareButtons } from './testPaperShare';
import PaperPopup from './PaperPopup';
import PaperBuilder from './PaperBuilder';
import PaperAnswerEditor from './PaperAnswerEditor';
import SafeHtml, { stripHtmlToText } from './PaperSafeHtml';
import './test-papers-redesign.css';
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
  return (
    <article className="edx-exam-card edx-paper-card">
      <div className="edx-paper-card-top">
        <span className="edx-paper-pill">{paper.code} | {paper.term}</span>
        <span className="edx-paper-lectures">{paper.lectures}</span>
      </div>
      <h3>{paper.title}</h3>
      <p>{paper.scopeNote}</p>
      <ul className="edx-paper-meta">
        <li>{paper.mcqs.length} MCQs</li>
        <li>{paper.shorts.length} Short questions</li>
        <li>{paper.longs.length} Long questions</li>
      </ul>
      <p className="edx-paper-meta-line">{paper.marks.total} marks · {paper.minutes} minutes</p>
      <button type="button" className="edx-exam-primary" onClick={onStart}>Start paper</button>
    </article>
  );
}

export function PaperRunner({ paper, onBack }) {
  const total = paperQuestionCount(paper);
  const paperUnit = paper.unitLabel === 'Topic' ? 'Topic' : 'Lecture';
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
  const [confirmModal, setConfirmModal] = useState(null); // null | 'submit' | 'retake'
  const timerRef = useRef(null);

  const attempted = useMemo(() => {
    let n = Object.keys(mcqAnswers).length;
    shortAnswers.forEach((a) => { if (stripHtmlToText(a).trim()) n += 1; });
    longAnswers.forEach((a) => { if (stripHtmlToText(a).trim()) n += 1; });
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

  const unanswered = total - attempted;

  useEffect(() => {
    if (!confirmModal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setConfirmModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmModal]);

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

  const handleSubmit = () => { setConfirmModal('submit'); };
  // Leaving mid-paper discards unsaved answers, so it goes through the
  // same professional modal as submit/retake instead of dropping work
  // on a stray tap. Submitted papers are already saved and unaffected.
  const doLeave = () => { setConfirmModal(null); onBack(); };

  const doSubmit = async () => {
    setConfirmModal(null);
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

  const handleRetake = () => { setConfirmModal('retake'); };

  const doRetake = () => {
    setConfirmModal(null);
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

  // Result share link: saved papers share by record id, pattern papers
  // rebuild from their pattern params (term included — without it a
  // Finalterm paper rebuilds as Midterm), registry papers by slug.
  const shareText = submitted
    ? paper.code + ' ' + paper.lectures + ' Test Paper — Name: ' + submitted.studentName + ', VU ID: ' + submitted.studentVuId + ', MCQ score: ' + submitted.mcqScore + '/' + paper.mcqs.length + '. Full paper: ' + (paperShareUrl(paper) || window.location.origin + '/test-papers')
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
    const hasSubjective = paper.shorts.length + paper.longs.length > 0;
    const mcqPct = paper.mcqs.length ? Math.round((submitted.mcqScore / paper.mcqs.length) * 100) : 0;
    return (
      <div className="edx-exam-stack edx-paper-page edx-paper-runner">
        <section className="edx-paper-result-hero">
          <div className="edx-paper-result-score">
            <div className="edx-paper-ring" role="img" aria-label={'MCQ score ' + mcqPct + ' percent'}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="edx-paper-ring-bg" cx="60" cy="60" r="52" />
                <circle className="edx-paper-ring-fg" cx="60" cy="60" r="52" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - mcqPct / 100)} />
              </svg>
              <span className="edx-paper-ring-text"><strong>{submitted.mcqScore}/{paper.mcqs.length}</strong><small>{mcqPct}%</small></span>
            </div>
            <span className="edx-paper-score-label">MCQ score</span>
          </div>
          <div className="edx-paper-result-info">
            <h2>Paper submitted</h2>
            <p><strong>{submitted.studentName}</strong> · VU ID {submitted.studentVuId} · {paper.lectures}</p>
            {teacherTotal === null
              ? (!hasSubjective
                ? <p>Is paper mein subjective sawal nahi the (selected lectures mein verified subjective sawal nahi mile).</p>
                : <p>Subjective answers are submitted to the teacher for review. Teacher marks will appear here after review.</p>)
              : <p className="edx-paper-score">Teacher marks (subjective): {teacherTotal} / {paper.marks.short + paper.marks.long} · Total: {submitted.mcqScore + teacherTotal} / {paper.marks.total}</p>}
            {submitted.teacherFeedback && <p><strong>Teacher feedback:</strong> {submitted.teacherFeedback}</p>}
            {saveState === 'saving' && <span className="edx-paper-save-pill" role="status">Saving your attempt for the teacher…</span>}
            {saveState === 'saved' && <span className="edx-paper-save-pill" role="status">Saved for the teacher. Receipt: {savedAttempt && savedAttempt.attemptId ? savedAttempt.attemptId.slice(0, 8) : ''}</span>}
            {saveState === 'failed' && (
              <p role="alert" className="edx-exam-alert">
                Your result below is correct, but it could not be saved for the teacher yet. Please try saving again.
                <button type="button" className="edx-exam-secondary" onClick={() => persistAttempt(submitted)}>Save again</button>
              </p>
            )}
          </div>
        </section>
        {weakLectures.length > 0 && (
          <section className="edx-exam-card">
            <h3>Focus {paperUnit.toLowerCase()}s — revise these first</h3>
            <p>These {paperUnit.toLowerCase()}s had the most MCQ mistakes.</p>
            <div className="edx-paper-focus-grid">
              {weakLectures.map((w) => (
                <div key={w.n} className="edx-paper-focus-item">
                  <strong>{paperUnit} {w.n}</strong>
                  <span>{w.wrong} / {w.total} wrong</span>
                  <span className="edx-paper-focus-bar"><span style={{ width: Math.round((w.wrong / w.total) * 100) + '%' }} /></span>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="edx-exam-actions edx-paper-result-actions">
          <a className="edx-exam-primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Send result to EduNexus (WhatsApp)</a>
          <button type="button" className="edx-exam-secondary" onClick={handleRetake}>Retake paper</button>
          <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to Test Papers</button>
        </div>
        <section className="edx-exam-card">
          <h3>MCQ review</h3>
          {paper.mcqs.map((q, i) => {
            const mine = submitted.mcqAnswers[i];
            const correct = mine === q.answer;
            return (
              <div key={i} className={'edx-paper-review-row ' + (correct ? 'correct' : 'wrong')}>
                <p><strong>Q{i + 1}{q.lectures ? ' (' + paperUnit + ' ' + q.lectures.join('/') + ')' : ''}.</strong> {q.q}
                  <span className={'edx-paper-review-badge ' + (correct ? 'correct' : 'wrong')}>{correct ? 'Correct' : 'Wrong'}</span>
                </p>
                <p>Your answer: {mine ? mine + '. ' + (q.options.find((o) => o.letter === mine) || {}).text : 'Not answered'}</p>
                {!correct && <p>Correct answer: {q.answer}. {(q.options.find((o) => o.letter === q.answer) || {}).text}</p>}
                <p className="edx-paper-explanation">{q.explanation}</p>
              </div>
            );
          })}
        </section>
        {hasSubjective && (<section className="edx-exam-card">
          <h3>Subjective answers vs model answers</h3>
          {paper.shorts.map((q, i) => (
            <div key={'s' + i} className="edx-paper-review-row">
              <p><strong>Short Q{i + 1}.</strong> {q.q}</p>
              <p><strong>Your answer:</strong></p>
              <SafeHtml className="edx-paper-answer-text" html={submitted.shortAnswers[i] || 'Not answered'} />
              <p><strong>Model answer:</strong></p>
              <SafeHtml className="edx-paper-answer-text" html={q.modelAnswer} />
            </div>
          ))}
          {paper.longs.map((q, i) => (
            <div key={'l' + i} className="edx-paper-review-row">
              <p><strong>Long Q{i + 1}.</strong> {q.q}</p>
              <p><strong>Your answer:</strong></p>
              <SafeHtml className="edx-paper-answer-text" html={submitted.longAnswers[i] || 'Not answered'} />
              <p><strong>Model answer:</strong></p>
              <SafeHtml className="edx-paper-answer-text" html={q.modelAnswer} />
            </div>
          ))}
        </section>)}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="edx-exam-stack edx-paper-page">
        <section className="edx-paper-cover">
          <span className="edx-paper-pill">{paper.code} | {paper.term}</span>
          <h1>{paper.code} — {paper.title} — Test Paper</h1>
          <p>{paper.lectures}</p>
          <div className="edx-paper-cover-meta">
            <span>{paper.mcqs.length} MCQs</span>
            <span>{paper.shorts.length} Short questions</span>
            <span>{paper.longs.length} Long questions</span>
            <span>{paper.marks.total} marks</span>
            <span>{paper.minutes} minutes</span>
          </div>
          {paperShareUrl(paper) && (
            <div className="edx-paper-cover-share">
              <span>Is paper ka link share karein:</span>
              <PaperShareButtons url={paperShareUrl(paper)} title={paper.code + ' — ' + paper.title + ' — Test Paper'} />
            </div>
          )}
        </section>
        <section className="edx-exam-card edx-exam-form edx-paper-details-card">
          <h3>Your details</h3>
          <p>Your name and VU ID are shown to the teacher with your attempt. Your answers are never shown to other students.</p>
          <label className="edx-exam-field">Name<input maxLength={80} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Your full name" /></label>
          <label className="edx-exam-field">VU ID<input maxLength={40} value={studentVuId} onChange={(e) => setStudentVuId(e.target.value)} placeholder="e.g. BC230400878" /></label>
          {coverError && <p role="alert" className="edx-exam-alert">{coverError}</p>}
          <button type="button" className="edx-exam-primary" onClick={startPaper}>Start paper ({paper.minutes} minutes)</button>
          <button type="button" className="edx-exam-secondary" onClick={onBack}>Back to Test Papers</button>
        </section>
        {savedAttempt && (
          <section className="edx-exam-card edx-paper-last-card">
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
    <div className="edx-exam-stack edx-paper-page edx-paper-runner">
      <div className="edx-paper-stickybar" role="status">
        <button type="button" className="edx-exam-secondary" onClick={() => setConfirmModal('leave')}>← Back</button>
        <span className="edx-paper-progress-text">{attempted} of {total} attempted</span>
        <span className={'edx-paper-timer' + (secondsLeft < 300 ? ' edx-paper-timer-low' : '')}>⏱ {fmtTime(secondsLeft)}</span>
        <button type="button" className="edx-exam-secondary" onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" className="edx-exam-primary" onClick={handleSubmit}>Finish &amp; submit</button>
        <span className="edx-paper-progress" aria-hidden="true"><span style={{ width: (total ? Math.round((attempted / total) * 100) : 0) + '%' }} /></span>
      </div>
      {timeUp && <p role="alert" className="edx-exam-alert">Time is up. You can still submit your paper.</p>}
      <nav className="edx-paper-palette" aria-label="Question palette">
        {Array.from({ length: total }, (_, i) => {
          const q = questionAt(i);
          const answered = q.kind === 'mcq'
            ? mcqAnswers[q.num] !== undefined
            : q.kind === 'short' ? Boolean(stripHtmlToText(shortAnswers[q.num]).trim()) : Boolean(stripHtmlToText(longAnswers[q.num]).trim());
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
      <p className="edx-paper-palette-legend"><span className="sw answered" /> Answered <span className="sw current" /> Current <span className="sw" /> Unanswered</p>
      <section className="edx-exam-card edx-paper-question-card">
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
          <div className="edx-exam-field">
            <span className="edx-paper-answer-label">Your answer</span>
            <PaperAnswerEditor key={'short-' + current.num} value={shortAnswers[current.num]} maxChars={2000} minHeight={160} placeholder="Type your answer here… Use the toolbar for formatting and Σ for equations." onChange={(nextHtml) => setShortAnswers((prev) => prev.map((v, j) => (j === current.num ? nextHtml : v)))} />
          </div>
        )}
        {current.kind === 'long' && (
          <div className="edx-exam-field">
            <span className="edx-paper-answer-label">Your answer</span>
            <PaperAnswerEditor key={'long-' + current.num} value={longAnswers[current.num]} maxChars={6000} minHeight={280} placeholder="Type your answer here… Use the toolbar for formatting and Σ for equations." onChange={(nextHtml) => setLongAnswers((prev) => prev.map((v, j) => (j === current.num ? nextHtml : v)))} />
          </div>
        )}
        <div className="edx-exam-actions">
          <button type="button" className="edx-exam-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
          {index < total - 1
            ? <button type="button" className="edx-exam-primary" onClick={() => setIndex(index + 1)}>Next</button>
            : <button type="button" className="edx-exam-primary" onClick={handleSubmit}>Finish &amp; submit</button>}
        </div>
      </section>
      {confirmModal && (
        <div className="edx-paper-modal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}>
          <div className="edx-paper-modal" role="dialog" aria-modal="true" aria-labelledby="edx-paper-modal-title">
            <h3 id="edx-paper-modal-title">{confirmModal === 'submit' ? 'Submit paper?' : confirmModal === 'leave' ? 'Leave paper?' : 'Retake paper?'}</h3>
            <div className="edx-paper-modal-stats">
              <span>{attempted} of {total} attempted</span>
              {confirmModal === 'submit' && unanswered > 0 && <span>{unanswered} unanswered</span>}
              <span>⏱ {fmtTime(secondsLeft)} left</span>
            </div>
            {confirmModal === 'submit' ? (
              <p>{unanswered > 0 ? 'Unanswered questions will count as wrong. ' : ''}You cannot change answers after submitting.</p>
            ) : confirmModal === 'leave' ? (
              <p>Your answers on this screen will be cleared. Papers you already submitted are saved.</p>
            ) : (
              <p>Start this paper again? Your current answers on this screen will be cleared.</p>
            )}
            <div className="edx-paper-modal-actions">
              <button type="button" className="edx-exam-secondary" autoFocus onClick={() => setConfirmModal(null)}>{confirmModal === 'retake' ? 'Cancel' : 'Keep answering'}</button>
              <button type="button" className="edx-exam-primary" onClick={confirmModal === 'submit' ? doSubmit : confirmModal === 'leave' ? doLeave : doRetake}>{confirmModal === 'submit' ? 'Submit paper' : confirmModal === 'leave' ? 'Leave paper' : 'Start again'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestPapersHome({ paperSlug, onSelectPaper }) {
  const [builderCode, setBuilderCode] = useState(null);
  // Opening a builder swaps the whole page below the hero — start at the top
  // so the builder heading is in view instead of wherever the grid was scrolled.
  useEffect(() => { if (builderCode) window.scrollTo({ top: 0, behavior: 'smooth' }); }, [builderCode]);
  const [builderTerm, setBuilderTerm] = useState(null);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [termFilter, setTermFilter] = useState('all'); // all | Midterm | Finalterm
  // Subject category (code prefix, e.g. CS / MGT): picking one shows only
  // that discipline's subjects instead of the whole 150+ card wall.
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [popupSubject, setPopupSubject] = useState(null);
  // Admin-uploaded banks merge over the code banks (admin copy wins on the
  // same code+term); while they load, the code banks render immediately.
  const { banks: adminBanks, loading: adminLoading } = useAdminBanks();
  const mergedSubjects = useMemo(() => mergeBankSubjects(BANK_SUBJECTS, adminBanks), [adminBanks]);
  const mergedCatalog = useMemo(() => mergeCatalog(SUBJECT_CATALOG, mergedSubjects), [mergedSubjects]);
  // Admin-built records: saved fixed papers + assignments (Firestore meta
  // docs, public read). Failures leave empty lists — the code papers keep
  // working exactly as before.
  const [savedPapers, setSavedPapers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedRun, setSavedRun] = useState(null);
  const [savedNote, setSavedNote] = useState('');
  const [vuLookup, setVuLookup] = useState('');
  const [vuShown, setVuShown] = useState(false);
  // ?saved= handling: track the id already opened (not a one-shot boolean),
  // so an in-app navigation to a different saved link still opens it, and a
  // fresh load always resolves against the loaded list.
  const handledSavedId = useRef(null);
  const savedRetry = useRef(false);
  // Re-render on every navigation event (browser back/forward included).
  // The pattern paper below is derived from window.location.search during
  // render, and the app's nav-path state does NOT change when only the
  // query changes (same pathname), so without this the pattern runner
  // stayed stuck on screen after "Back to Test Papers" / browser back.
  const [, setNavTick] = useState(0);
  useEffect(() => {
    const sync = () => setNavTick((t) => t + 1);
    window.addEventListener('popstate', sync);
    window.addEventListener('edunexus:navigation', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('edunexus:navigation', sync);
    };
  }, []);
  // The ?saved= id in the URL right now (recomputed on every render, so an
  // in-app navigation to a saved link is picked up without a remount).
  const savedParam = (() => {
    try { return new URLSearchParams(window.location.search).get('saved'); } catch (_) { return null; }
  })();
  useEffect(() => {
    let alive = true;
    Promise.all([listSavedPapers().catch(() => []), listAssignments().catch(() => [])]).then(([p, a]) => {
      if (!alive) return;
      setSavedPapers(p);
      setAssignments(a);
      setSavedLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  const buildSavedPaper = (p) => {
    const subject = mergedSubjects.find((s) => s.code === p.code && (!p.term || s.term === p.term))
      || mergedSubjects.find((s) => s.code === p.code);
    if (!subject) {
      // Admin banks may still be loading: a missing subject right now is not
      // proof the paper is gone — say so instead of a false "not available".
      setSavedNote(adminLoading ? 'Paper bank load ho raha hai — thodi der baad dobara try karein.' : 'Is paper ka subject data abhi available nahi hai. Admin se contact karein.');
      return;
    }
    const built = buildPaper(subject, p.lectures, { mcq: p.mcq, short: p.short, long: p.long });
    if (built.mcqs.length + built.shorts.length + built.longs.length === 0) {
      setSavedNote('Is paper ke lectures mein koi verified sawal nahi mila. Admin se contact karein.');
      return;
    }
    // Keep the record id on the built paper so the runner can share this
    // exact saved paper (?saved=<id>) instead of a rebuilt pattern link.
    setSavedRun({ ...built, savedId: p.id });
  };
  useEffect(() => {
    // No ?saved= in the URL: clear the handled marker so the same link can
    // be opened again after going back to the list.
    if (!savedParam) {
      handledSavedId.current = null;
      savedRetry.current = false;
      return;
    }
    if (savedLoading || adminLoading) return;
    if (handledSavedId.current === savedParam) return;
    const p = savedPapers.find((x) => x.id === savedParam);
    if (p) {
      handledSavedId.current = savedParam;
      buildSavedPaper(p);
      return;
    }
    // Not in the loaded list (yet): one retry against the live table, so a
    // transient list failure cannot turn into a false "paper not found".
    if (!savedRetry.current) {
      savedRetry.current = true;
      listSavedPapers().catch(() => []).then((fresh) => {
        // The user may have navigated to a different saved link while this
        // retry was in flight — only open the paper if this id is still the
        // one in the URL.
        let currentId = null;
        try { currentId = new URLSearchParams(window.location.search).get('saved'); } catch (_) {}
        if (currentId !== savedParam) return;
        const found = (fresh || []).find((x) => x.id === savedParam);
        if (found) {
          handledSavedId.current = savedParam;
          buildSavedPaper(found);
        } else {
          setSavedNote('Ye saved paper nahi mila — ho sakta hai admin ne ise delete kar diya ho. Neeche list se koi paper chunain.');
        }
      });
      return;
    }
    setSavedNote('Ye saved paper nahi mila — ho sakta hai admin ne ise delete kar diya ho. Neeche list se koi paper chunain.');
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedLoading, adminLoading, savedPapers, savedParam]);
  // NOTE: everything below up to the early returns must stay hook-free of
  // conditional placement — the home list, the runner and the builder all
  // return early, so all hooks and the list derivations live up here.
  const filteredSubjects = mergedCatalog.filter((s) => {
    const q = subjectQuery.trim().toUpperCase();
    if (!q) return true;
    if (s.code.includes(q)) return true;
    const bankSub = mergedSubjects.find((x) => x.code === s.code);
    return bankSub && bankSub.title && bankSub.title.toUpperCase().includes(q);
  });
  // Clean by default: only live subjects show until the student searches —
  // the other 86 buttons were a wall of dead ends. Searching still finds
  // every subject (with the admin-contact popup for non-live ones).
  const shownSubjects = subjectQuery.trim() ? filteredSubjects : filteredSubjects.filter((s) => s.status === 'live');
  // Categories for the picker: distinct codes per code prefix, with the
  // live-subject count. Sorted by size (biggest discipline first) so the
  // most-used categories sit at the front of the row.
  const categories = useMemo(() => {
    const counts = {};
    shownSubjects.forEach((s) => {
      const p = subjectPrefix(s.code);
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.keys(counts)
      .map((prefix) => ({ prefix, name: categoryName(prefix), count: counts[prefix] }))
      .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));
  }, [shownSubjects]);
  const categorySubjects = selectedCategory === 'all'
    ? shownSubjects
    : shownSubjects.filter((s) => subjectPrefix(s.code) === selectedCategory);
  const activeCategory = selectedCategory === 'all'
    ? null
    : categories.find((c) => c.prefix === selectedCategory) || null;
  // Structured data for crawlers: the live test-paper banks as an ItemList,
  // so Google sees the catalogue as real links instead of JS-only cards.
  // Capped at 100 entries to keep the block small.
  useEffect(() => {
    if (adminLoading) return undefined;
    const items = mergedSubjects
      .filter((s) => s.lectures && s.lectures.length > 0)
      .slice(0, 100)
      .map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.code + ' ' + (s.term || 'Midterm') + ' Test Paper',
        url: SITE + '/test-papers?subject=' + s.code + '&term=' + (s.term || 'Midterm')
          + '&lectures=' + s.lectures.map((l) => l.n).join(',') + '&mcqs=20&shorts=3&longs=3',
      }));
    let el = document.head.querySelector('script[data-edunexus-testpapers]');
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.dataset.edunexusTestpapers = 'true';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'VU Test Papers',
      itemListElement: items,
    }).replace(/</g, '\\u003c');
    return () => {
      const stale = document.head.querySelector('script[data-edunexus-testpapers]');
      if (stale) stale.remove();
    };
  }, [mergedSubjects, adminLoading]);
  const paper = paperSlug ? getTestPaper(paperSlug) : null;
  if (paper) return <PaperRunner paper={paper} onBack={() => onSelectPaper('')} />;
  if (builderCode) return <PaperBuilder subjectCode={builderCode} term={builderTerm} onBack={() => { setBuilderCode(null); setBuilderTerm(null); }} />;
  if (savedRun) return <PaperRunner paper={savedRun} onBack={() => { setSavedRun(null); try { window.history.pushState({}, '', '/test-papers'); window.dispatchEvent(new Event('edunexus:navigation')); } catch (_) {} }} />;
  // Shared pattern link: /test-papers?subject=CODE&term=Finalterm&lectures=1,3&mcqs=20&shorts=3&longs=3
  // (built by the admin in Paper Patterns). It rebuilds exactly that paper;
  // unknown subjects or empty selections fall through to the home + popup.
  const pattern = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawCode = params.get('subject');
      if (!rawCode) return null;
      const code = rawCode.toUpperCase();
      const termParam = (params.get('term') || '').toLowerCase();
      const subject = mergedSubjects.find((s) => s.code === code && (!termParam || (s.term || '').toLowerCase() === termParam))
        || mergedSubjects.find((s) => s.code === code);
      if (!subject) return adminLoading ? { loading: true } : { error: code };
      const lectures = (params.get('lectures') || '').split(',').map((x) => parseInt(x, 10))
        .filter((n) => Number.isFinite(n) && subject.lectures.some((l) => l.n === n));
      if (lectures.length === 0) return { error: code };
      const clamp = (v, d, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
      const built = buildPaper(subject, lectures, {
        mcq: clamp(params.get('mcqs'), 20, 1, 50),
        short: clamp(params.get('shorts'), 3, 0, 5),
        long: clamp(params.get('longs'), 3, 0, 5),
      });
      if (built.mcqs.length + built.shorts.length + built.longs.length === 0) return { error: code };
      return { paper: built };
    } catch (_) { return null; }
  })();
  if (pattern && pattern.paper) {
    return <PaperRunner paper={pattern.paper} onBack={() => { try { window.history.pushState({}, '', '/test-papers'); window.dispatchEvent(new Event('edunexus:navigation')); } catch (_) {} }} />;
  }
  if (pattern && pattern.loading) {
    return <div className="edx-exam-stack edx-paper-page"><section className="edx-exam-card" role="status"><p>Paper load ho raha hai…</p></section></div>;
  }
  const clearPatternParams = () => { try { window.history.pushState({}, '', '/test-papers'); window.dispatchEvent(new Event('edunexus:navigation')); } catch (_) {} };
  // Ready-made count: the static PHY101 paper plus the live admin-saved
  // papers. Counting only the static list said "1 ready-made paper" while
  // three saved papers were listed below it.
  const readyMadeCount = savedLoading ? TEST_PAPERS.length : TEST_PAPERS.length + savedPapers.length;
  // Term counts for the hero: distinct subjects with a Midterm / Finalterm bank.
  const midtermSubjectCount = new Set(mergedSubjects.filter((x) => x.term === 'Midterm').map((x) => x.code)).size;
  const finaltermSubjectCount = new Set(mergedSubjects.filter((x) => x.term === 'Finalterm').map((x) => x.code)).size;
  // Term grouping: Midterm cards together, Finalterm cards together — never
  // mixed in one flat grid. Each live subject renders one card per bank,
  // with the term on a coloured pill and the bank's MCQ count on the card.
  const subjectCards = (s, term) => {
    if (s.status !== 'live') {
      if (term !== 'coming') return [];
      return [(
        <button key={s.code} type="button" className="edx-paper-subject"
          onClick={() => setPopupSubject(s)}>
          <strong>{s.code}</strong>
          <span>{s.status === 'mapping' ? 'Tayyar ho raha hai' : s.status === 'finalonly' ? 'Midterm data nahi' : 'Data nahi mila'}</span>
        </button>
      )];
    }
    const banks = mergedSubjects.filter((x) => x.code === s.code);
    if (banks.length === 0) {
      if (term !== 'Midterm') return [];
      return [(
        <button key={s.code} type="button" className="edx-paper-subject live term-midterm"
          onClick={() => { setBuilderCode(s.code); setBuilderTerm(null); }}>
          <span className="edx-paper-subject-top"><strong>{s.code}</strong><span className="edx-paper-term-pill term-midterm">Midterm</span></span>
          <span>Live — paper banayein</span>
        </button>
      )];
    }
    return banks
      .filter((bankSub) => (bankSub.term || 'Midterm') === term)
      .map((bankSub) => {
        const cardUnit = bankSub.unitLabel === 'Topic' ? 'Topic' : 'Lecture';
        const lecRange = bankSub.lectures && bankSub.lectures.length
          ? `${cardUnit}s ${bankSub.lectures[0].n}–${bankSub.lectures[bankSub.lectures.length - 1].n}`
          : null;
        const termClass = (bankSub.term || 'Midterm') === 'Finalterm' ? 'term-finalterm' : 'term-midterm';
        const mcqCount = bankSub.bank && bankSub.bank.mcqs ? bankSub.bank.mcqs.length : 0;
        return (
          <button key={`${s.code}::${bankSub.term}`} type="button" className={`edx-paper-subject live ${termClass}`}
            onClick={() => { setBuilderCode(s.code); setBuilderTerm(bankSub.term); }}>
            <span className="edx-paper-subject-top"><strong>{s.code}</strong><span className={`edx-paper-term-pill ${termClass}`}>{bankSub.term || 'Midterm'}</span></span>
            {bankSub.title && <span className="edx-paper-subject-title">{bankSub.title}</span>}
            <span>{`${lecRange || ''}${lecRange && mcqCount ? ' · ' : ''}${mcqCount ? mcqCount + ' MCQs' : ''}`}</span>
          </button>
        );
      });
  };
  const midtermCards = categorySubjects.flatMap((s) => subjectCards(s, 'Midterm'));
  const finaltermCards = categorySubjects.flatMap((s) => subjectCards(s, 'Finalterm'));
  const comingCards = categorySubjects.flatMap((s) => subjectCards(s, 'coming'));
  // Compact rows for the open category card's panel: the same subjects as
  // the grid cards above, but as one-line rows that live INSIDE the card.
  const subjectRows = (s, term) => {
    if (s.status !== 'live') {
      if (term !== 'coming') return [];
      return [(
        <button key={s.code} type="button" className="edx-paper-category-row coming"
          onClick={() => setPopupSubject(s)}>
          <span className="edx-paper-category-row-code">{s.code}</span>
          <span className="edx-paper-category-row-title">{s.status === 'mapping' ? 'Tayyar ho raha hai' : s.status === 'finalonly' ? 'Midterm data nahi' : 'Data nahi mila'}</span>
          <span className="edx-paper-category-row-arrow" aria-hidden="true">›</span>
        </button>
      )];
    }
    const banks = mergedSubjects.filter((x) => x.code === s.code);
    if (banks.length === 0) {
      if (term !== 'Midterm') return [];
      return [(
        <button key={s.code} type="button" className="edx-paper-category-row"
          onClick={() => { setBuilderCode(s.code); setBuilderTerm(null); }}>
          <span className="edx-paper-category-row-code">{s.code}</span>
          <span className="edx-paper-category-row-title">Live — paper banayein</span>
          <span className="edx-paper-category-row-term term-midterm">Midterm</span>
          <span className="edx-paper-category-row-arrow" aria-hidden="true">›</span>
        </button>
      )];
    }
    return banks
      .filter((bankSub) => (bankSub.term || 'Midterm') === term)
      .map((bankSub) => {
        const rowUnit = bankSub.unitLabel === 'Topic' ? 'Topic' : 'Lecture';
        const lecRange = bankSub.lectures && bankSub.lectures.length
          ? `${rowUnit}s ${bankSub.lectures[0].n}–${bankSub.lectures[bankSub.lectures.length - 1].n}`
          : null;
        const termClass = (bankSub.term || 'Midterm') === 'Finalterm' ? 'term-finalterm' : 'term-midterm';
        const mcqCount = bankSub.bank && bankSub.bank.mcqs ? bankSub.bank.mcqs.length : 0;
        return (
          <button key={`${s.code}::${bankSub.term}`} type="button" className="edx-paper-category-row"
            onClick={() => { setBuilderCode(s.code); setBuilderTerm(bankSub.term); }}>
            <span className="edx-paper-category-row-code">{s.code}</span>
            <span className="edx-paper-category-row-title">{bankSub.title || s.code}</span>
            <span className="edx-paper-category-row-meta">{`${lecRange || ''}${lecRange && mcqCount ? ' · ' : ''}${mcqCount ? mcqCount + ' MCQs' : ''}`}</span>
            <span className={`edx-paper-category-row-term ${termClass}`}>{bankSub.term || 'Midterm'}</span>
            <span className="edx-paper-category-row-arrow" aria-hidden="true">›</span>
          </button>
        );
      });
  };
  const panelMidtermRows = categorySubjects.flatMap((s) => subjectRows(s, 'Midterm'));
  const panelFinaltermRows = categorySubjects.flatMap((s) => subjectRows(s, 'Finalterm'));
  const panelComingRows = categorySubjects.flatMap((s) => subjectRows(s, 'coming'));
  return (
    <div className="edx-exam-stack edx-paper-page">
      <section className="edx-paper-cover">
        <h1>Test Papers</h1>
        <p>Take a full paper online — MCQs are checked instantly, subjective answers go to the teacher.</p>
        <div className="edx-paper-cover-meta">
          <span>{adminLoading ? '…' : `${mergedCatalog.filter((s) => s.status === 'live').length} live subjects`}</span>
          <span>{readyMadeCount} ready-made paper{readyMadeCount === 1 ? '' : 's'}</span>
          <span>Free for VU students</span>
          <span>{adminLoading ? '…' : `${midtermSubjectCount} Midterm subjects`}</span>
          <span>{adminLoading ? '…' : `${finaltermSubjectCount} Finalterm subjects`}</span>
        </div>
      </section>
      {pattern && pattern.error && <PaperPopup code={pattern.error} note="Is subject ka paper data abhi available nahi hai, ya link mein lectures theek nahi hain. Admin se contact karein." onClose={clearPatternParams} />}
      <section className="edx-exam-card">
        <h2>Build your own paper</h2>
        <p>Choose a subject and lectures — your paper is built only from verified questions, most-repeated concepts first.</p>
        <label className="edx-exam-field">Search subject<input type="text" value={subjectQuery} onChange={(e) => { setSubjectQuery(e.target.value.toUpperCase()); setSelectedCategory('all'); }} placeholder="Subject code likhein, jaise MTH202" /></label>
        <div className="edx-paper-term-tabs" role="tablist" aria-label="Term filter">
          <button type="button" className={termFilter === 'all' ? 'active' : ''} onClick={() => setTermFilter('all')}>All terms</button>
          <button type="button" className={termFilter === 'Midterm' ? 'active term-midterm' : 'term-midterm'} onClick={() => setTermFilter('Midterm')}>Midterm</button>
          <button type="button" className={termFilter === 'Finalterm' ? 'active term-finalterm' : 'term-finalterm'} onClick={() => setTermFilter('Finalterm')}>Final Term</button>
        </div>
        {categories.length > 0 && (
          <div className="edx-paper-categories" role="group" aria-label="Subject categories">
            <button type="button" className={'edx-paper-category-card' + (selectedCategory === 'all' ? ' active' : '')} aria-pressed={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')}>
              <span className="edx-paper-category-tile" aria-hidden="true">All</span>
              <span className="edx-paper-category-body">
                <strong>All subjects</strong>
                <span>{shownSubjects.length} subjects</span>
              </span>
              <span className="edx-paper-category-chevron" aria-hidden="true">▾</span>
            </button>
            {categories.map((c) => (
              <button key={c.prefix} type="button" className={'edx-paper-category-card' + (selectedCategory === c.prefix ? ' open' : '')} aria-pressed={selectedCategory === c.prefix} aria-expanded={selectedCategory === c.prefix} onClick={() => setSelectedCategory(selectedCategory === c.prefix ? 'all' : c.prefix)} title={c.name + ' — ' + c.count + ' subjects'}>
                <span className="edx-paper-category-tile" aria-hidden="true">{c.prefix}</span>
                <span className="edx-paper-category-body">
                  <strong>{c.name}</strong>
                  <span>{c.prefix} · {c.count} subjects</span>
                </span>
                <span className="edx-paper-category-chevron" aria-hidden="true">▾</span>
              </button>
            ))}
          </div>
        )}
        {activeCategory && (
          <section className="edx-paper-category-panel" aria-label={activeCategory.name + ' subjects'}>
            <div className="edx-paper-category-panel-head">
              <span className="edx-paper-category-tile" aria-hidden="true">{activeCategory.prefix}</span>
              <div className="edx-paper-category-panel-titles">
                <h3>{activeCategory.name} ({activeCategory.prefix})</h3>
                <p>{activeCategory.count} subjects · kisi subject par tap karein, us ka paper banayein</p>
              </div>
              <button type="button" className="edx-exam-secondary" onClick={() => setSelectedCategory('all')}>✕ Close</button>
            </div>
            {(termFilter === 'all' || termFilter === 'Midterm') && panelMidtermRows.length > 0 && (
              <div>
                <h4 className="edx-paper-category-panel-term term-midterm">Midterm · {panelMidtermRows.length} subjects</h4>
                <div className="edx-paper-category-rows">{panelMidtermRows}</div>
              </div>
            )}
            {(termFilter === 'all' || termFilter === 'Finalterm') && panelFinaltermRows.length > 0 && (
              <div>
                <h4 className="edx-paper-category-panel-term term-finalterm">Final Term · {panelFinaltermRows.length} subjects</h4>
                <div className="edx-paper-category-rows">{panelFinaltermRows}</div>
              </div>
            )}
            {termFilter === 'all' && panelComingRows.length > 0 && (
              <div>
                <h4 className="edx-paper-category-panel-term">Coming soon · {panelComingRows.length} subjects</h4>
                <div className="edx-paper-category-rows">{panelComingRows}</div>
              </div>
            )}
            {panelMidtermRows.length + panelFinaltermRows.length + panelComingRows.length === 0 && (
              <p className="edx-paper-meta-line">Is category mein is term ka koi subject nahi hai.</p>
            )}
          </section>
        )}
        {adminLoading ? (
          <p role="status" className="edx-paper-meta-line">Paper banks load ho rahe hain…</p>
        ) : !activeCategory ? (
          <>
            {(termFilter === 'all' || termFilter === 'Midterm') && midtermCards.length > 0 && (
              <div>
                <h3 className="edx-paper-term-heading term-midterm"><span className="edx-paper-term-dot" />Midterm papers<span className="edx-paper-term-count">{midtermCards.length} subjects</span></h3>
                <div className="edx-paper-subject-grid">{midtermCards}</div>
              </div>
            )}
            {(termFilter === 'all' || termFilter === 'Finalterm') && finaltermCards.length > 0 && (
              <div>
                <h3 className="edx-paper-term-heading term-finalterm"><span className="edx-paper-term-dot" />Final Term papers<span className="edx-paper-term-count">{finaltermCards.length} subjects</span></h3>
                <div className="edx-paper-subject-grid">{finaltermCards}</div>
              </div>
            )}
            {termFilter === 'all' && comingCards.length > 0 && (
              <div>
                <h3 className="edx-paper-term-heading"><span className="edx-paper-term-dot coming" />Coming soon<span className="edx-paper-term-count">{comingCards.length} subjects</span></h3>
                <div className="edx-paper-subject-grid">{comingCards}</div>
              </div>
            )}
          </>
        ) : null}
        {!adminLoading && !activeCategory && categorySubjects.length === 0 && <p>{subjectQuery.trim() ? 'Koi subject nahi mila. Code dobara check karein.' : 'Koi live subject nahi mila.'}</p>}
        {popupSubject && <PaperPopup code={popupSubject.code} note={SUBJECT_STATUS_NOTE[popupSubject.status]} onClose={() => setPopupSubject(null)} />}
      </section>
      {savedNote && (
        <section className="edx-exam-card" role="alert">
          <p>{savedNote}</p>
          <button type="button" className="edx-exam-secondary" onClick={() => { setSavedNote(''); try { window.history.pushState({}, '', '/test-papers'); window.dispatchEvent(new Event('edunexus:navigation')); } catch (_) {} }}>Back to test papers</button>
        </section>
      )}
      {savedLoading && (
        <section className="edx-exam-card" role="status">
          <p>Saved papers load ho rahe hain…</p>
        </section>
      )}
      {!savedLoading && assignments.length > 0 && (
        <section className="edx-exam-card">
          <h2>Assigned papers</h2>
          <p>Teacher ne aap ko koi paper assign kiya hai to apni VU ID daal kar dekhein.</p>
          <label className="edx-exam-field">Apni VU ID
            <input type="text" value={vuLookup} onChange={(e) => setVuLookup(e.target.value.toUpperCase())} placeholder="Jaise BC230400878" />
          </label>
          <button type="button" className="edx-exam-primary" disabled={!vuLookup.trim()} onClick={() => setVuShown(true)}>Mere assigned papers dekhein</button>
          {vuShown && (
            <div style={{ marginTop: 12 }}>
              {assignments.filter((a) => (a.vuIds || []).map((v) => String(v).toUpperCase()).includes(vuLookup.trim().toUpperCase())).map((a) => (
                <div key={a.id} className="edx-paper-assigned-row">
                  <span className="edx-paper-saved-row-title">{a.paperTitle}</span>
                  <span className="edx-paper-saved-row-actions">
                  {a.paperType === 'saved'
                    ? <button type="button" className="edx-exam-primary" onClick={() => { const p = savedPapers.find((x) => x.id === a.paperId); if (p) buildSavedPaper(p); else setSavedNote('Ye assigned paper ab available nahi hai.'); }}>Start paper</button>
                    : <a className="edx-exam-primary" style={{ textDecoration: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 700 }} href={a.link}>Start paper</a>}
                  </span>
                </div>
              ))}
              {assignments.filter((a) => (a.vuIds || []).map((v) => String(v).toUpperCase()).includes(vuLookup.trim().toUpperCase())).length === 0 && <p>Is VU ID par koi assigned paper nahi mila.</p>}
            </div>
          )}
        </section>
      )}
      {!savedLoading && savedPapers.length > 0 && (
        <section className="edx-exam-card">
          <h2>Teacher ke banaye papers</h2>
          <p>Admin ne ye papers khud banaye hain — verified bank questions se, lectures aur counts ke saath.</p>
          {savedPapers.map((p) => {
            const savedUnit = ((mergedSubjects.find((x) => x.code === p.code && (!p.term || x.term === p.term)) || mergedSubjects.find((x) => x.code === p.code)) || {}).unitLabel === 'Topic' ? 'Topic' : 'Lecture';
            return (
            <div key={p.id} className="edx-paper-saved-row">
              <span className="edx-paper-saved-row-title">{p.title}</span>
              <span className="edx-paper-saved-row-meta">{p.code} ({p.term}) · {savedUnit}s {p.lectures.join(', ')} · {p.mcq} MCQs, {p.short} shorts, {p.long} longs{p.builtCounts ? ` · ${p.builtCounts.marks && typeof p.builtCounts.marks === 'object' ? p.builtCounts.marks.total : p.builtCounts.marks} marks` : ''}</span>
              <span className="edx-paper-saved-row-actions">
              <button type="button" className="edx-exam-primary" onClick={() => buildSavedPaper(p)}>Start paper</button>
              <PaperShareButtons url={savedPaperUrl(p.id)} title={p.title + ' — ' + p.code + ' Test Paper'} />
              </span>
            </div>
            );
          })}
        </section>
      )}
      {TEST_PAPERS.map((p) => (
        <PaperCard key={p.slug} paper={p} onStart={() => onSelectPaper(p.slug)} />
      ))}
    </div>
  );
}
