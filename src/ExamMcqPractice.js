import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listMcqs, updateMcq, subscribeMcqs } from './db/examMcqs';
import { getProgress, saveProgress } from './db/examProgress';
import { BookOpen, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { adminPanelAccess } from './adminSession';
import { categoryOf, quizSetOf } from './examMcqImport';
import { explanationForStudent, explanationPrompt, plainFeedback } from './examAnswerFeedback';
import { CATEGORY_NAMES, answerKeyStats, attemptMessage, buildPracticeAttempt, canAdvance, isVerifiedAnswer, orderedQuestions, progressKey, QUESTION_LIMIT, recordAnswer, restoreAttemptIds, sanitizeProgress } from './examPractice';
import RichContent from './RichContent';
import { useConfirm } from './ConfirmDialog';
import './exam-mcq-practice.css';

// In-memory cache for MCQ questions: subject -> { docs, fetchedAt }.
// Serves repeat visits instantly with ZERO Firestore reads for 5 minutes.
// Refresh button (setRefresh) bypasses this cache.
const questionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const validSubject = (subject) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(subject);
const isAdmin = (user) => adminPanelAccess(user);
const localGet = (key) => {
  try { return JSON.parse(window.localStorage.getItem(key) || 'null'); }
  catch (_) { return null; }
};
const localPut = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (_) { return false; }
};
const updatedAt = (record) => Number(record?.updatedAt || 0);
function QuestionReview({ question, selected, onSelect, number, total, onPrevious, onNext, onFinish, onAskAI, aiBusy, aiError, aiAnswer }) {
  const answered = Number.isInteger(selected);
  const right = answered && selected === question.answer;
  return <section className="edx-exam-card edx-exam-question edx-practice-question" aria-label={'Question ' + number}>
    <div className="edx-exam-between"><span className="edx-exam-eyebrow">Question {number} of {total}</span><span className="edx-exam-pill">{question.subject} · {CATEGORY_NAMES[categoryOf(question)] || 'Practice'}</span></div>
    <div className="edx-exam-progress"><span style={{ width: (number / total * 100) + '%' }}/></div>
    <h3><RichContent value={question.question}/></h3>
    <div className="edx-exam-options">{question.options.map((option, i) => {
      const state = answered && i === question.answer ? ' correct' :
        answered && i === selected ? ' incorrect' : '';
      return <button key={i} type="button" disabled={answered}
        className={'edx-exam-option' + state} aria-pressed={selected === i}
        onClick={() => onSelect(question.id, i)}><span>{String.fromCharCode(65 + i)}</span><RichContent value={option}/></button>;
    })}</div>
    {answered && <p className={'edx-practice-inline-result ' + (right ? 'is-right' : 'is-wrong')} role="status">
      {right ? 'Correct!' :
        <>Incorrect. Correct answer: {String.fromCharCode(65 + question.answer)} — <RichContent value={question.options[question.answer]}/>.</>}
    </p>}
    <div className="edx-practice-actions"><button type="button" className="edx-exam-secondary" onClick={onPrevious} disabled={number === 1}><ChevronLeft size={16}/> Previous</button>
      {aiError && <button type="button" className="edx-exam-secondary" onClick={onAskAI} disabled={!answered || aiBusy}><BrainCircuit size={16}/>{aiBusy ? 'Explaining…' : 'Retry explanation'}</button>}
      <button type="button" className="edx-exam-primary" onClick={onNext} disabled={!answered || number === total} title={!answered ? 'Select an answer to continue' : undefined}>Next <ChevronRight size={16}/></button></div>
    {answered && (aiBusy || aiError || aiAnswer) && <section className="edx-practice-ai" aria-live="polite">
      <strong><BrainCircuit size={17}/> Quick explanation</strong>
      {aiBusy && <p>Explaining this question…</p>}
      {aiError && <p role="status">{aiError}</p>}
      {aiAnswer && <p><RichContent value={aiAnswer}/></p>}
    </section>}
    <button type="button" className="edx-exam-secondary edx-practice-finish-bottom" onClick={onFinish}>Finish now · see my score</button>
  </section>;
}

function AdminAnswerReview({ question, onUpdated }) {
  const [answer, setAnswer] = useState(question.answer);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { requestConfirm, ConfirmUI } = useConfirm();
  useEffect(() => { setAnswer(question.answer); setSource(''); setMessage(''); }, [question.id, question.answer]);
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (source.trim().length < 12) { setMessage('Describe the trusted handout, answer key or reasoning used to verify this answer (at least 12 characters).'); return; }
    requestConfirm({
      message: 'Publish the reviewed option and use it for future score calculations?',
      confirmLabel: 'Publish',
      onConfirm: async () => {
        setBusy(true); setMessage('');
        try {
          const marker = '[EduNexus admin verified]';
          let explanation = String(question.explanation || '');
          if (!explanation.includes(marker)) explanation = (explanation + ' ' + marker).trim();
          const note = ' Admin review source: ' + source.trim();
          if (explanation.length + note.length > 1000) throw new Error('Verification note exceeds the Firestore explanation length limit. Shorten the source reference.');
          explanation += note;
          await updateMcq(question.id, { answer: Number(answer), explanation });
          onUpdated({ ...question, answer: Number(answer), explanation });
          setMessage('Admin review saved. This answer can now contribute to scores.');
          setSource('');
        } catch (error) { setMessage(error?.message || 'Could not save the reviewed answer.'); }
        finally { setBusy(false); }
      },
    });
    return;
  };
  return <details className="edx-practice-admin"><summary><ShieldCheck size={16}/> Administrator · verify or correct this answer</summary>
    <form onSubmit={save}><p>Check the original course handout or reliable answer key. AI output alone is not verification. Other users' existing selections will remain unchanged.</p>
      <label>Correct option <select value={answer} onChange={(e) => setAnswer(Number(e.target.value))}>{question.options.map((option, i) => <option value={i} key={i}>{String.fromCharCode(65 + i)} — {option.slice(0, 90)}</option>)}</select></label>
      <label>Verification source <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={250} placeholder="e.g. CS620 handout, lecture 12, page 6" required/></label>
      <button className="edx-exam-primary" disabled={busy}>{busy ? 'Saving…' : 'Save reviewed answer'}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <ConfirmUI />
  </details>;
}

export default function ExamMcqPractice({ user, subject, term, onSubjectChange, onTermChange, onBankLoaded, categoryCounts = {}, subjects = [] }) {
  const { requestConfirm, ConfirmUI } = useConfirm();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [limited, setLimited] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentId, setCurrentId] = useState(null);
  const [finished, setFinished] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [ai, setAi] = useState({ id: null, busy: false, answer: '', error: '' });
  const [sourceChanges, setSourceChanges] = useState({});
  const [quizSet, setQuizSet] = useState('all');
  const [quizSets, setQuizSets] = useState([]);
  const [attemptIds, setAttemptIds] = useState(null);
  const [attemptMode, setAttemptMode] = useState('sequence');
  const [desiredMode, setDesiredMode] = useState('sequence');
  const [desiredCount, setDesiredCount] = useState('all');
  const [customCount, setCustomCount] = useState(10);
  const [attemptLimit, setAttemptLimit] = useState('all');
  const sessionRef = useRef(0);
  const writeTimer = useRef(null);
  const pendingCloud = useRef(null);
  const saveRevision = useRef(0);
  // Lock synchronously before React rerenders; rapid double taps must never
  // replace an answer or trigger a second explanation request.
  const answerLocksRef = useRef(new Set());
  const answersRef = useRef({});
  const aiRequestRef = useRef(0);
  // Anonymous Firebase UIDs can rotate after browser/session restart. Use a
  // stable device-local key for guest progress; signed-in students remain
  // isolated by their authenticated UID for private cloud syncing.
  const recordKey = progressKey(subject, term, user?.isAnonymous ? 'guest' : (user?.uid || 'guest')) + (term === 'quiz' && quizSet !== 'all' ? ':set:' + quizSet : '');
  const cloudProgressId = subject + '_' + term + (term === 'quiz' && quizSet !== 'all' ? '_set_' + quizSet : '');
  useEffect(() => { setQuizSet('all'); }, [subject, term]);
  const eligible = validSubject(subject);
  const actualQuestions = useMemo(() => {
    const available = new Map(questions.map(q => [q.id, sourceChanges[q.id] || q]));
    if (!attemptIds) return questions.map(q => available.get(q.id));
    return attemptIds.map(id => available.get(id)).filter(Boolean);
  }, [questions, sourceChanges, attemptIds]);
  const index = Math.max(0, actualQuestions.findIndex(q => q.id === currentId));
  const current = actualQuestions[index];
  const stats = useMemo(() => answerKeyStats(actualQuestions, answers), [actualQuestions, answers]);
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return actualQuestions.map((q, i) => ({ q, i })).filter(({ q }) =>
      [q.question, ...q.options].some(value => String(value).toLowerCase().includes(needle))).slice(0, 80);
  }, [actualQuestions, search]);

  // One stable key per subject and exam type; changing filters cannot overwrite
  // another subject's saved answers or leave a stale cloud request in this session.
  useEffect(() => {
    const session = ++sessionRef.current;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    if (pendingCloud.current) { const queued = pendingCloud.current; pendingCloud.current = null; if (user?.uid) void saveProgress(user.uid, cloudProgressId, queued.payload).catch(() => {}); }
    answerLocksRef.current = new Set();
    answersRef.current = {};
    aiRequestRef.current++;
    setQuestions([]); setAnswers({}); setCurrentId(null); setFinished(false); setRestoring(true); setLimited(false); setAttemptIds(null);
    setSourceChanges({}); setSearch(''); setLoadError(''); setSaveStatus(''); setAi({ id: null, busy: false, answer: '', error: '' });
    if (!eligible) { setLoading(false); setRestoring(false); setLoadError('Enter a valid subject code.'); return; }
    setLoading(true);
    let initialized = false;
    let unsubscribe = () => {};
    // Check cache first: if fresh data exists, use it instantly (0 reads, instant render).
    const cached = questionCache.get(subject);
    const now = Date.now();
    if (cached && (now - cached.fetchedAt) < CACHE_TTL_MS && cached.docs) {
      // Serve from cache - process the cached questions the same way as fresh items
      const all = orderedQuestions(cached.docs, term);
      if (term === 'quiz') setQuizSets([...new Set(all.map(quizSetOf))].sort((a,b) => a.localeCompare(b,undefined,{numeric:true})));
      else setQuizSets([]);
      const ordered = term === 'quiz' && quizSet !== 'all' ? all.filter(q => quizSetOf(q) === quizSet) : all;
      setQuestions(ordered);
      onBankLoaded?.(subject, term, ordered.length);
      setLimited(cached.docs.length >= QUESTION_LIMIT);
      setLoadError('');
      setLoading(false); setRestoring(false);
      initialized = true;
      // Still set up a lightweight listener for real-time updates? No - cache is fresh,
      // skip the query entirely to save reads. User can hit "Check for new questions" to refresh.
      return () => {};
    }
    // Adapter read + invalidation subscription: the subject-only query avoids a
    // new composite index. The Quiz category is physically stored as midterm
    // with a Quiz marker for old rules.
    const applyItems = async items => {
      if (sessionRef.current !== session) return;
      // Populate cache for future visits
      questionCache.set(subject, { docs: items, fetchedAt: Date.now() });
      const all = orderedQuestions(items.filter(q => q.isActive !== false), term);
      if (term === 'quiz') setQuizSets([...new Set(all.map(quizSetOf))].sort((a,b) => a.localeCompare(b,undefined,{numeric:true})));
      else setQuizSets([]);
      const ordered = term === 'quiz' && quizSet !== 'all' ? all.filter(q => quizSetOf(q) === quizSet) : all;
      setQuestions(ordered);
      onBankLoaded?.(subject, term, ordered.length);
      setLimited(items.length >= QUESTION_LIMIT);
      setLoadError('');
      if (initialized) return; // Preserve in-progress choices when new MCQs publish.
      initialized = true;
      const local = localGet(recordKey);
      let cloud = null;
      if (user?.uid) {
        try {
          cloud = await getProgress(user.uid, cloudProgressId);
        } catch (_) {
          if (sessionRef.current === session)
            setSaveStatus('Offline/local mode. Cloud sync will retry when you answer a question.');
        }
      }
      if (sessionRef.current !== session) return;
      const latest = updatedAt(local) >= updatedAt(cloud) ? local : cloud;
      const savedIds = restoreAttemptIds(latest, ordered);
      const selectedQuestions = savedIds.map(id => ordered.find(q => q.id === id)).filter(Boolean);
      const restored = sanitizeProgress(latest, selectedQuestions);
      setAttemptIds(savedIds);
      setAttemptMode(latest?.attemptMode === 'random' ? 'random' : 'sequence');
      setAttemptLimit(latest?.attemptLimit || 'all');
      setDesiredMode(latest?.attemptMode === 'random' ? 'random' : 'sequence');
      setDesiredCount(latest?.attemptLimit === 'all' || !latest?.attemptLimit ? 'all' : [5,10,20,30,50,100].includes(Number(latest.attemptLimit)) ? String(latest.attemptLimit) : 'custom');
      if (latest?.attemptLimit !== 'all' && Number.isInteger(Number(latest?.attemptLimit)))
        setCustomCount(Math.max(1,Math.min(QUESTION_LIMIT,Number(latest.attemptLimit))));
      answersRef.current = restored.answers;
      answerLocksRef.current = new Set(Object.keys(restored.answers));
      setAnswers(restored.answers); setCurrentId(restored.currentId); setFinished(restored.finished);
      if (latest) setSaveStatus('Your saved practice has been restored.');
      setLoading(false); setRestoring(false);
    };
    const loadError = error => {
      if (sessionRef.current !== session) return;
      setLoadError(error?.code === 'permission-denied'
        ? 'MCQ bank could not load. Check published Firestore read rules.'
        : 'Questions could not load. Check your connection and retry.');
      setLoading(false); setRestoring(false);
    };
    const refresh = async () => {
      try {
        await applyItems(await listMcqs({ subject, limit: QUESTION_LIMIT, activeOnly: false }));
      } catch (error) { loadError(error); }
    };
    refresh();
    unsubscribe = subscribeMcqs({ subject, onInvalidate: refresh });
    return () => {
      unsubscribe();
      if (writeTimer.current) clearTimeout(writeTimer.current);
      if (pendingCloud.current) {
        const queued = pendingCloud.current; pendingCloud.current = null;
        if (user?.uid) void saveProgress(user.uid, cloudProgressId, queued.payload).catch(() => {});
      }
      sessionRef.current++;
    };
  }, [subject, term, quizSet, refresh, user?.uid, recordKey, cloudProgressId, eligible, onBankLoaded]);

  const save = useCallback((nextAnswers, nextId, nextFinished, nextAttempt = null) => {
    if (restoring || !actualQuestions.length) return;
    const payload = { answers: nextAnswers, currentId: nextId, finished: nextFinished,
      subject, term, attemptIds: nextAttempt?.ids || attemptIds, attemptMode: nextAttempt?.mode || attemptMode, attemptLimit: nextAttempt?.count ?? attemptLimit, updatedAt: Date.now() };
    const localSaved = localPut(recordKey, payload);
    setSaveStatus(localSaved ? 'Saved in this browser · syncing to Firebase…' : 'Local storage unavailable · syncing to Firebase…');
    if (writeTimer.current) clearTimeout(writeTimer.current);
    const revision = ++saveRevision.current;
    const session = sessionRef.current;
    if (user?.uid) {
      pendingCloud.current = { payload };
      writeTimer.current = setTimeout(async () => {
        const queued = pendingCloud.current;
        pendingCloud.current = null;
        if (!queued) return;
        try {
          await saveProgress(user.uid, cloudProgressId, queued.payload);
          if (sessionRef.current === session && saveRevision.current === revision) setSaveStatus('Saved to your private Firebase session and this browser.');
        } catch (_) {
          if (sessionRef.current === session && saveRevision.current === revision)
            setSaveStatus(localSaved ? 'Saved in this browser; cloud sync unavailable. Your device progress is safe.' : 'Could not save progress. Check browser storage and Firebase access.');
        }
      }, 650);
    } else { pendingCloud.current = null; setSaveStatus(localSaved ? 'Saved on this device. Sign in to sync between devices.' : 'Could not save progress. Enable browser storage.'); }
  }, [restoring, actualQuestions.length, recordKey, subject, term, cloudProgressId, user?.uid, attemptIds, attemptMode, attemptLimit]);

  const select = (id, option) => {
    if (finished || restoring || id !== current?.id || answerLocksRef.current.has(id)) return;
    const next = recordAnswer(answersRef.current, id, option);
    if (next === answersRef.current) return;
    answerLocksRef.current.add(id);
    answersRef.current = next;
    setAnswers(next);
    save(next, id, false);
    void askAI(option);
  };
  const goTo = (target, resume = false) => {
    if (!target) return;
    if (resume) setFinished(false);
    aiRequestRef.current++;
    setCurrentId(target.id); setAi({ id: null, busy: false, answer: '', error: '' });
    save(answersRef.current, target.id, resume ? false : finished);
  };
  const nextQuestion = () => {
    if (!canAdvance(actualQuestions, answersRef.current, index)) return;
    goTo(actualQuestions[index + 1]);
  };
  const finish = () => {
    aiRequestRef.current++;
    setFinished(true); save(answersRef.current, currentId, true);
  };
  const startConfiguredAttempt = (resetOnly = false) => {
    if (!questions.length || loading || restoring) return;
    const doStart = () => {
    const mode = resetOnly ? attemptMode : desiredMode;
    const count = resetOnly ? attemptLimit : desiredCount === 'all' ? 'all' : Math.max(1, Math.min(questions.length, Number(desiredCount === 'custom' ? customCount : desiredCount) || 1));
    const ids = buildPracticeAttempt(questions, count, mode);
    setAttemptIds(ids); setAttemptMode(mode); setAttemptLimit(count);
    setDesiredMode(mode); setDesiredCount(count === 'all' ? 'all' : [5,10,20,30,50,100].includes(count) ? String(count) : 'custom');
    setCustomCount(count === 'all' ? Math.min(10, questions.length) : count);
    answerLocksRef.current = new Set();
    answersRef.current = {};
    aiRequestRef.current++;
    setAnswers({}); setFinished(false); setAi({ id:null, busy:false, answer:'', error:'' }); setSearch('');
    setCurrentId(ids[0] || null);
    save({}, ids[0] || null, false, { ids, mode, count });
    };
    if (stats.answered || finished) {
      requestConfirm({
        message: 'Start a new attempt? Your saved choices for this subject and quiz set will be replaced.',
        confirmLabel: 'Start new',
        onConfirm: doStart,
      });
      return;
    }
    doStart();
  };
  const restart = () => startConfiguredAttempt(true);
  const askAI = async (selectedOption = null) => {
    if (!current || ai.busy || finished) return;
    const questionId = current.id;
    const selectedValue = Number.isInteger(selectedOption) ? selectedOption : answersRef.current[questionId];
    if (!Number.isInteger(selectedValue)) return;
    const requestId = ++aiRequestRef.current;
    setAi({ id: questionId, busy: true, answer: '', error: '' });
    const prompt = explanationPrompt(current, selectedValue);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 24000);
      let response;
      try {
        response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }), signal: controller.signal });
      } finally { clearTimeout(timer); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.text !== 'string' || !data.text.trim())
        throw new Error('AI explanation is unavailable.');
      if (aiRequestRef.current === requestId)
        setAi({ id: questionId, busy: false, answer: plainFeedback(data.text), error: '' });
    } catch (_) {
      if (aiRequestRef.current === requestId)
        setAi({ id: questionId, busy: false, answer: '',
          error:'AI explanation is temporarily unavailable; your answer and progress are saved.' });
    }
  };

  const updateReviewed = (newQuestion) => {
    setSourceChanges(prev => ({ ...prev, [newQuestion.id]: newQuestion }));
    aiRequestRef.current++;
    setAi({ id: null, busy: false, answer: '', error: '' });
  };

  return <section className="edx-exam-stack edx-practice" aria-label="Subject-wise exam practice">
    <div className="edx-exam-section-title"><div><span className="edx-exam-eyebrow">Practice workspace</span>
      <h2>{subject} · {CATEGORY_NAMES[term] || term} practice</h2>
      <p>Choose your question count and original or random order. Your selected questions and progress stay saved in this browser.</p>
    </div><BookOpen size={28}/></div>
    <div className="edx-exam-card edx-practice-toolbar">
      <div className="edx-practice-active-bank" aria-label="Active practice bank">
        <div className="edx-practice-active-icon"><BookOpen size={20} aria-hidden="true" /></div>
        <div><span>Active practice bank</span><strong>{subject} · {CATEGORY_NAMES[term] || term}</strong></div>
        <span className="edx-practice-active-count">{loading || restoring ? 'Loading…' : questions.length + ' MCQs'}</span>
      </div>
      {term === 'quiz' && quizSets.length > 1 && <label className="edx-exam-field">Quiz set
        <select value={quizSet} onChange={e=>setQuizSet(e.target.value)}>
          <option value="all">All quizzes ({quizSets.length} sets)</option>
          {quizSets.map(set=><option value={set} key={set}>{set}</option>)}
        </select></label>}
      <div className="edx-practice-setup" role="group" aria-label="Customize this practice attempt">
        <label className="edx-exam-field">Number of questions
          <select value={desiredCount} onChange={e=>setDesiredCount(e.target.value)}>
            <option value="all">All available ({questions.length})</option>
            {[5,10,20,30,50,100].filter(n=>n<=questions.length).map(n=><option key={n} value={String(n)}>{n} questions</option>)}
            <option value="custom">Custom count…</option>
          </select>
        </label>
        {desiredCount === 'custom' && <label className="edx-exam-field">Your count<input type="number" min={1} max={Math.max(1,questions.length)} value={customCount}
          onChange={e=>setCustomCount(e.target.value)} aria-label="Custom question count"/></label>}
        <label className="edx-exam-field">Question order
          <select value={desiredMode} onChange={e=>setDesiredMode(e.target.value)}>
            <option value="sequence">Original file sequence</option><option value="random">Random (no repeats)</option>
          </select>
        </label>
        <button type="button" className="edx-exam-primary edx-practice-start" disabled={!questions.length || loading || restoring}
          onClick={()=>startConfiguredAttempt()}>{stats.answered || finished ? 'Start new selected practice' : 'Apply practice settings'}</button>
      </div>
      <label className="edx-exam-field edx-practice-search-field">Search questions <span className="edx-practice-search"><Search size={17}/>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a question or topic…"/></span></label>
      <div className="edx-practice-toolbar-right"><span className="edx-exam-pill">{CATEGORY_NAMES[term] || term}</span><span className="edx-exam-pill">Answered: {stats.answered}/{actualQuestions.length}</span>
        <span className="edx-exam-pill">Score: {stats.score}/{stats.answered}</span>
        {!finished && actualQuestions.length > 0 && <button type="button" className="edx-exam-primary" onClick={finish}>Finish now</button>}</div>
      <p className="edx-practice-key-note">Score follows the saved answer key for this practice bank.</p>
      {search.trim() && <div className="edx-practice-results"><strong>{matches.length} matching questions{matches.length === 80 ? ' (first 80)' : ''}</strong>
        <div>{matches.map(({ q, i }) => <button type="button" key={q.id} onClick={() => { setSearch(''); goTo(q, true); }}>
          <span>Q{i+1}</span> {q.question.slice(0, 145)} {answers[q.id] !== undefined ? ' ✓' : ''}
        </button>)}</div>
        {!matches.length && <p>No questions match your search in {subject} · {CATEGORY_NAMES[term]}.</p>}
      </div>}
    </div>
    <p className="edx-practice-save edx-practice-visually-hidden" role="status">{saveStatus || (user?.isAnonymous ? 'Guest practice is saved in this browser; anonymous Firebase accounts may change between sessions. Use a personal account where available for private cross-device progress. IP addresses are not used.' : user?.uid ? 'Signed-in progress is saved by your private Firebase user ID, not your IP address.' : 'Guest progress is saved in this browser when storage is available.')}</p>
    {(loading || restoring) && <div className="edx-exam-card" role="status">Loading your questions and saved progress…</div>}
    {limited && <p className="edx-practice-catalog-note">Showing up to {QUESTION_LIMIT} published questions for this subject. If the subject has more questions, ask the site administrator to split large banks into smaller sets.</p>}
    {loadError && <div className="edx-exam-alert" role="alert">{loadError} <button type="button" className="edx-exam-secondary" onClick={() => setRefresh(v => v + 1)}>Retry</button></div>}
    {!loading && !restoring && !loadError && !actualQuestions.length && <div className="edx-exam-card edx-exam-empty">
      <CircleHelp size={29}/><h3>No questions found for {subject} · {CATEGORY_NAMES[term]}</h3>
      <p>No published questions were found for this combination. Quiz questions are listed separately from Midterm and Finalterm, even if their legacy Firestore records use the Midterm field.</p>
      <div className="edx-practice-empty-actions">{[["quiz", "Quiz"], ["midterm", "Midterm"], ["finalterm", "Finalterm"]].filter(([kind]) => kind !== term && categoryCounts[kind] > 0).map(([kind, label]) => <button type="button" key={kind} className="edx-exam-primary" onClick={() => onTermChange?.(kind)}>Open {label} · {categoryCounts[kind]} available</button>)}
      <button type="button" className="edx-exam-secondary" onClick={() => (()=>{questionCache.delete(subject); setRefresh(v => v + 1);})()}>Check for new questions</button></div></div>}
    {!loading && !restoring && !loadError && !!actualQuestions.length && !finished && current && <>
      <QuestionReview question={current} number={index+1} total={actualQuestions.length} selected={answers[current.id]}
        onSelect={select} onPrevious={() => goTo(actualQuestions[index-1])} onNext={nextQuestion}
        onFinish={finish} onAskAI={askAI} aiBusy={ai.busy && ai.id === current.id}
        aiError={ai.id === current.id ? ai.error : ''} aiAnswer={ai.id === current.id ? ai.answer : ''}/>
      {isAdmin(user) && <AdminAnswerReview question={current} onUpdated={updateReviewed}/>}
    </>}
    {!loading && !restoring && !loadError && !!actualQuestions.length && finished &&
      <div className="edx-exam-card edx-practice-summary">
        <CheckCircle2 size={34}/><h3>Practice completed · {subject} {CATEGORY_NAMES[term]}</h3>
        <div className="edx-practice-stat-grid"><div><strong>{stats.answered}/{actualQuestions.length}</strong><span>Answered</span></div>
          <div><strong>{stats.score}/{stats.answered}</strong><span>Practice score</span></div>
          <div><strong>{stats.answered ? Math.round(100 * stats.score / stats.answered) : 0}%</strong><span>Accuracy on answered questions</span></div>
          <div><strong>{stats.unattempted}</strong><span>Unanswered</span></div></div>
        <p className="edx-practice-performance" role="status">{attemptMessage(stats.score, stats.answered, actualQuestions.length)}</p>
        <p className="edx-practice-score-note">Your score follows this practice bank’s saved answer key. Answer choices remain saved even if you finish early.</p>
        <div className="edx-practice-actions"><button type="button" className="edx-exam-primary" onClick={() => { setFinished(false); save(answersRef.current, currentId, false); }}>Review or continue this attempt</button>
          <button type="button" className="edx-exam-secondary" onClick={restart}><RotateCcw size={15}/> Start a new attempt</button></div>
      </div>}
    <p className="edx-practice-privacy"><ShieldCheck size={15}/> Progress is saved per subject and exam type to this browser and, when signed in, to your private Firebase user record. IP addresses are not used: they can change or be shared by different students. To resume on a different device, use the same Firebase account.</p>
    <ConfirmUI />
  </section>;
}
