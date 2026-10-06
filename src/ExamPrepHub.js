import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { ChevronRight, FileText, GraduationCap, ShieldCheck, Sparkles, Search, BookOpen, MessageCircle, ArrowDownUp, Share2, Link2, Check } from "lucide-react";
import { db } from "./firebase-client";
import { validateMcq } from "./examMcqImport";
import { EXAM_CATEGORIES, EXAM_SUBJECT_LIMIT, catalogFromCounts, publishedExamCatalog } from "./examCatalog";
import { readCatalogFromSupabase } from "./examCatalogCounts";
import { routeParamsFromPath } from "./app-routes.mjs";
import { adminPanelAccess } from './adminSession';

import "./exam-prep-hub.css";
const ExamPaperCommunity = React.lazy(() => import("./ExamPaperCommunity"));
const ExamPaperReviewManager = React.lazy(() => import("./ExamPaperReviewManager"));
const McqBulkImporter = React.lazy(() => import("./McqBulkImporter"));
const ExamMcqAdminManager = React.lazy(() => import("./ExamMcqAdminManager"));
const ExamMcqPractice = React.lazy(() => import("./ExamMcqPractice"));

const ROOT = ["artifacts", "edunexus-live", "public", "data"];
const col = (name) => collection(db, ...ROOT, name);
const safe = (value, max = 3000) => String(value || "").trim().slice(0, max);
const courseCode = (value) => safe(value, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
const validCourse = (value) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(value);
const isAdmin = (user) => adminPanelAccess(user);
const dateValue = (value) => value && typeof value.toMillis === "function" ? value.toMillis() : 0;
const shuffle = (items) => {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch (_) { return ""; }
};
const SUBJECTS = ["CS620", "CS101", "CS201", "CS301", "CS302", "CS304", "CS401", "CS403", "CS510", "CS511", "CS601", "CS604", "CS610", "ENG101", "ENG201", "MGT101", "MGT201", "MTH101", "MTH202", "MTH601", "PHY101", "STA301"];
const EMPTY_MCQ = { subject: "CS101", term: "finalterm", quizSet:"GENERAL-QUIZ", question: "", options: ["", "", "", ""], answer: 0, explanation: "", verificationSource: "" };

const databaseReadError = (error, resource) => error?.code === "permission-denied"
  ? `${resource} temporarily unavailable: the database denied access. The website administrator must publish the updated Firestore rules.`
  : `${resource} could not load. Please check your connection and retry.`;

function CourseSelector({ value, onChange, subjects = SUBJECTS }) {
  const listId = React.useId();
  return <label className="edx-exam-field">Subject code
    <input list={listId} value={value} onChange={(event) => onChange(courseCode(event.target.value))} placeholder="e.g. CS201" maxLength={12} />
    <datalist id={listId}>{subjects.map((s) => <option value={s} key={s} />)}</datalist>
  </label>;
}

function TermSelector({ value, onChange, includeQuiz = false }) {
  return <label className="edx-exam-field">Exam type
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {includeQuiz && <option value="quiz">Quiz</option>}<option value="midterm">Midterm</option><option value="finalterm">Finalterm</option>
    </select>
  </label>;
}

function StudyFiles({ subject, onSubjectChange, subjects }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  useEffect(() => {
    if (!validCourse(subject)) { setFiles([]); setLoading(false); return; }
    let live = true;
    setLoading(true); setError('');
    // Quota fix 2026-09-30: one-time cached fetch per subject (30 min) instead
    // of a live listener. Study files change rarely.
    (async () => {
      try {
        const key = "edx-studyfiles-" + subject;
        const cached = JSON.parse(localStorage.getItem(key) || "null");
        if (cached && Date.now() - cached.ts < 1800000 && Array.isArray(cached.items)) {
          if (!live) return;
          setFiles(cached.items.filter((f) => safeUrl(f.url || f.downloadUrl || f.fileUrl)));
          setLoading(false);
          return;
        }
        const snapshot = await getDocs(query(col("files"), where("subject", "==", subject), limit(100)));
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), items })); } catch (_) {}
        if (!live) return;
        setFiles(items.filter((f) => safeUrl(f.url || f.downloadUrl || f.fileUrl)));
        setLoading(false);
      } catch (_) {
        if (live) { setError('Study files could not load. Please try again.'); setLoading(false); }
      }
    })();
    return () => { live = false; };
  }, [subject]);
  const visible = useMemo(() => files.filter(file =>
    [file.name, file.title, file.description, file.ext].some(value =>
      String(value || '').toLowerCase().includes(search.trim().toLowerCase())))
    .sort((a,b) => {
      if (sort === 'name') return safe(a.name || a.title).localeCompare(safe(b.name || b.title));
      return dateValue(b.createdAt) - dateValue(a.createdAt);
    }), [files, search, sort]);
  return <div className="edx-study-page">
    <section className="edx-study-hero"><span className="edx-exam-eyebrow"><BookOpen size={15}/> Your study library</span>
      <h1>Find the material you need.</h1>
      <p>Browse handouts, notes and shared resources for your subject.</p></section>
    <div className="edx-study-controls">
      <CourseSelector value={subject} onChange={onSubjectChange} subjects={subjects}/>
      <label className="edx-exam-field">Find a file <span className="edx-study-search"><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title or file type…"/></span></label>
      <label className="edx-exam-field">Sort files <select value={sort} onChange={e=>setSort(e.target.value)}>
        <option value="newest">Recently added</option><option value="name">Name A–Z</option>
      </select></label>
    </div>
    <section className="edx-exam-card edx-study-results" aria-live="polite">
      <div className="edx-exam-between"><h2>{subject} study files</h2><span className="edx-exam-pill">{visible.length} {visible.length === 1 ? 'file' : 'files'}</span></div>
      {loading && <p role="status">Loading study files…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !visible.length && <div className="edx-study-empty"><FileText size={26}/><h3>{search ? 'No matching files' : 'No files shared for this subject yet'}</h3><p>{search ? 'Try another search or clear the search box.' : 'Browse the Academic Hub to find resources for other subjects.'}</p>{search && <button type="button" className="edx-exam-secondary" onClick={()=>setSearch('')}>Clear search</button>}</div>}
      {!loading && !!visible.length && <div className="edx-study-grid">{visible.map(file =>
        <article className="edx-study-file" key={file.id}><div className="edx-study-icon"><FileText size={21}/></div>
          <div><strong>{safe(file.name || file.title,120) || 'Study resource'}</strong><small>{safe(file.ext,10).toUpperCase() || 'RESOURCE'} · {subject}</small></div>
          <a className="edx-exam-secondary" target="_blank" rel="noopener noreferrer" href={safeUrl(file.url || file.downloadUrl || file.fileUrl)}>Open <ChevronRight size={16}/></a>
        </article>)}</div>}
      <a className="edx-exam-secondary edx-study-browse" href="/?page=academic">Browse all study material <ChevronRight size={16}/></a>
    </section>
  </div>;
}

function AdminTools({ user, onView }) {
  const [adminSubTab, setAdminSubTab] = useState('import');
  const [draft, setDraft] = useState(EMPTY_MCQ);
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");
  const [lastPublished, setLastPublished] = useState(null);
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    if (!isAdmin(user)) return;
    try {
      const snapshot = await getDocs(query(col("examReviewSubmissions"), limit(100)));
      setPending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)));
    } catch (_) { setMessage("Cannot load submissions. Deploy and check Firestore rules."); }
  };
  useEffect(() => { if (isAdmin(user)) void reload(); }, [user]);
  const normalize = (item) => {
    const source = String(item.verificationSource || '').trim();
    if (source.length < 12) throw new Error('Give the original handout, trusted answer key or lecture reference (at least 12 characters) before publishing a verified answer.');
    const validated = validateMcq(item);
    const note = ' [EduNexus admin verified] Admin review source: ' + source;
    if (validated.explanation.length + note.length > 1000) throw new Error('Explanation and verification source together must be within 1000 characters.');
    return { ...validated, explanation:validated.explanation + note, createdAt:serverTimestamp() };
  };
  const addOne = async (event) => {
    event.preventDefault();
    if (!isAdmin(user)) { setMessage("Admin session expired. Please log in again."); return; }
    setBusy(true); setMessage("");
    try { const published = normalize(draft); await addDoc(col("examMcqs"), published); setLastPublished({subject:published.subject, term:draft.term}); setDraft({ ...EMPTY_MCQ, subject: draft.subject, term: draft.term }); setMessage("MCQ published successfully. The public practice page updates automatically; use the link below to open the exact subject and exam type."); }
    catch (error) { setMessage(error.message || "MCQ could not be published."); } finally { setBusy(false); }
  };
  const moderate = async (review, approve) => {
    if (!isAdmin(user)) { setMessage("Admin session expired. Please log in again."); return; }
    setBusy(true); setMessage("");
    try {
      const batch = writeBatch(db);
      if (approve) {
        batch.set(doc(col("examReviews"), review.id), { subject: review.subject, term: review.term, examDate: review.examDate, difficulty: review.difficulty, topics: safe(review.topics, 400), summary: safe(review.summary, 1500), createdAt: serverTimestamp() });
      }
      batch.update(doc(col("examReviewSubmissions"), review.id), { status: approve ? "approved" : "rejected", moderatedAt: serverTimestamp() });
      await batch.commit();
      setPending((prev) => prev.filter((r) => r.id !== review.id)); setMessage(approve ? "Review approved and published." : "Review rejected.");
    } catch (_) { setMessage("Moderation failed. Check deployed security rules and try again."); } finally { setBusy(false); }
  };
  if (!isAdmin(user)) return null;
  return <div className="edx-exam-stack"><div className="edx-exam-section-title"><div><span className="edx-exam-eyebrow">Verified administrator</span><h2>Exam content management</h2><p>Only publish original or properly licensed questions and completed-exam guidance.</p></div><ShieldCheck size={28} /></div>
    {message && <p role="status" className="edx-exam-alert">{message}</p>}
    {lastPublished && <div className="edx-exam-publish-actions">
      <a className="edx-exam-primary" href={'/?page=exam-prep&subject=' + encodeURIComponent(lastPublished.subject) + '&term=' + encodeURIComponent(lastPublished.term)} target="_blank" rel="noopener noreferrer">Open published {lastPublished.subject} {lastPublished.term} quiz <ChevronRight size={16}/></a>
      <button type="button" className="edx-exam-secondary" onClick={() => onView?.(lastPublished.subject, lastPublished.term)}>Preview in Admin Panel</button>
    </div>}
    <form className="edx-exam-card edx-exam-form" onSubmit={addOne}><h3>Add an MCQ</h3><div className="edx-exam-form-grid"><CourseSelector value={draft.subject} onChange={(value) => setDraft((v) => ({ ...v, subject: value }))} /><TermSelector includeQuiz value={draft.term} onChange={(value) => setDraft((v) => ({ ...v, term: value }))} /></div>
      {draft.term === "quiz" && <label className="edx-exam-field">Quiz set / category<input maxLength={40} value={draft.quizSet} placeholder="QUIZ-1" onChange={(e) => setDraft((v) => ({...v,quizSet:e.target.value}))}/></label>}
      <label className="edx-exam-field">Question<textarea rows={2} maxLength={1000} required value={draft.question} onChange={(e) => setDraft((v) => ({ ...v, question: e.target.value }))} /></label>
      {draft.options.map((option, i) => <label className="edx-exam-field" key={i}>Option {String.fromCharCode(65 + i)}<textarea required rows={2} maxLength={350} value={option} onChange={(e) => setDraft((v) => ({ ...v, options: v.options.map((x, j) => i === j ? e.target.value : x) }))} /></label>)}
      <label className="edx-exam-field">Correct option<select value={draft.answer} onChange={(e) => setDraft((v) => ({ ...v, answer: Number(e.target.value) }))}>{draft.options.map((_, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></label>
      <label className="edx-exam-field">Explanation (optional)<textarea rows={2} maxLength={1000} value={draft.explanation} onChange={(e) => setDraft((v) => ({ ...v, explanation: e.target.value }))} /></label>
      <label className="edx-exam-field">Answer verification source (required)<input type="text" required minLength={12} maxLength={220} value={draft.verificationSource} placeholder="e.g. CS101 handout, lecture 04, page 11" onChange={(e) => setDraft(v => ({ ...v, verificationSource:e.target.value }))}/><small>Use a specific handout or trusted answer key. AI guesses alone cannot verify an answer.</small></label>
      <button className="edx-exam-primary" disabled={busy}>Publish MCQ</button>
    </form>
    <div className="edx-admin-subtabs" style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {[
        {id:'import',label:'📥 Import JSON'},
        {id:'manage',label:'📝 Manage MCQs'},
        {id:'reviews',label:'📄 Paper Reviews'},
      ].map(t => (
        <button key={t.id} type="button" onClick={()=>setAdminSubTab(t.id)}
          className={adminSubTab===t.id ? 'edx-exam-primary' : 'edx-exam-secondary'}
          style={{padding:'10px 18px',borderRadius:10,fontWeight:700}}>
          {t.label}
        </button>
      ))}
    </div>
    {adminSubTab==='import' && <React.Suspense fallback={<section className="edx-exam-card" role="status">Loading JSON importer…</section>}><McqBulkImporter user={user} onView={onView}/></React.Suspense>}
    {adminSubTab==='manage' && <React.Suspense fallback={<section className="edx-exam-card" role="status">Loading question manager…</section>}><ExamMcqAdminManager user={user} initialSubject={draft.subject}/></React.Suspense>}
    {adminSubTab==='reviews' && <React.Suspense fallback={<section className="edx-exam-card" role="status">Loading paper review manager…</section>}><ExamPaperReviewManager user={user}/></React.Suspense>}
    <section className="edx-exam-card edx-exam-form"><div className="edx-exam-between"><h3>Legacy pending paper reviews ({pending.filter((r) => r.status === "pending").length})</h3><button className="edx-exam-secondary" onClick={reload} disabled={busy}>Refresh</button></div>
      {pending.filter((r) => r.status === "pending").map((r) => <div className="edx-exam-pending" key={r.id}><p><strong>{safe(r.subject, 12)} · {safe(r.term, 10)} · {safe(r.examDate, 10)}</strong></p><p>{safe(r.topics, 400)}</p><p>{safe(r.summary, 1500)}</p><div className="edx-exam-actions"><button className="edx-exam-primary" disabled={busy} onClick={() => moderate(r, true)}>Approve</button><button className="edx-exam-secondary" disabled={busy} onClick={() => moderate(r, false)}>Reject</button></div></div>)}
      {!pending.some((r) => r.status === "pending") && <p>No pending reviews in the latest 100 submissions.</p>}
    </section>
  </div>;
}


// ShareBar: lets users share the current tab (MCQ Bank / Paper Reviews)
// via copy-link or WhatsApp. The Paper Reviews tab shares the generic
// /paper-reviews link with no subject name; the MCQ Bank tab keeps the
// subject-specific share link.
function ShareBar({ tab, subject, term }) {
  const [copied, setCopied] = React.useState(false);
  const isReviews = tab === "reviews";
  const tabLabel = tab === "mcqs" ? "MCQ Bank" : isReviews ? "Paper Reviews" : "Study Files";
  const termLabel = term === "quiz" ? "Quiz" : term === "midterm" ? "Midterm" : "Finalterm";
  const shareUrl = isReviews
    ? "https://edunexus.dpdns.org/paper-reviews"
    : "https://edunexus.dpdns.org/exam-prep/" + encodeURIComponent(subject) + "/" + encodeURIComponent(term) + "/" + tab;
  const shareText = isReviews
    ? "Paper Reviews on EduNexus"
    : subject + " " + termLabel + " " + tabLabel + " on EduNexus";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (_) {}
      document.body.removeChild(ta);
    }
  };
  const whatsAppUrl = "https://wa.me/?text=" + encodeURIComponent(shareText + "\n" + shareUrl);
  return (
    <div className="edx-share-bar" role="group" aria-label={"Share " + tabLabel}>
      <span className="edx-share-bar-label"><Share2 size={15} /> {isReviews ? "Share reviews" : "Share this " + tabLabel}</span>
      {!isReviews && <span className="edx-share-bar-subject">{subject} · {termLabel}</span>}
      <button type="button" onClick={copyLink} className="edx-share-bar-btn" aria-label="Copy share link">
        {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? "Copied!" : "Copy link"}
      </button>
      <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="edx-share-bar-btn edx-share-bar-wa" aria-label="Share on WhatsApp">
        <MessageCircle size={16} /> WhatsApp
      </a>
    </div>
  );
}

// detectSectionFromUrl: resolves the active tab from the URL. Supports the
// legacy ?section= param, /exam-prep/<subject>/<term>/<section> share links,
// and the dedicated /mcq-bank and /paper-reviews pages.
function detectSectionFromUrl() {
  const fromParam = new URLSearchParams(window.location.search).get('section');
  if (['mcqs', 'reviews', 'files'].includes(fromParam)) return fromParam;
  const path = window.location.pathname || '';
  if (/^\/mcq-bank(\/|$)/i.test(path)) return 'mcqs';
  if (/^\/paper-reviews(\/|$)/i.test(path)) return 'reviews';
  const m = path.match(/^\/exam-prep\/[^/]+\/[^/]+\/(mcqs|reviews|files)/i);
  if (m && ['mcqs', 'reviews', 'files'].includes(m[1].toLowerCase())) return m[1].toLowerCase();
  return '';
}

// SampleMcqs: 5 interactive sample questions shown by default so the MCQ Bank
// page never looks empty. Fully client-side, no database reads.
const SAMPLE_MCQS = [
  {
    id: 'sample-1', subject: 'CS101',
    question: 'Which of the following is an example of an operating system?',
    options: ['Microsoft Word', 'Linux', 'Google Chrome', 'Adobe Photoshop'],
    answer: 1,
    explanation: 'Linux manages hardware and software resources, which is the job of an operating system. The others are applications.'
  },
  {
    id: 'sample-2', subject: 'MTH101',
    question: 'What is the value of 12\u00B2 \u2212 8\u00B2?',
    options: ['80', '64', '16', '48'],
    answer: 0,
    explanation: '12\u00B2 = 144 and 8\u00B2 = 64, so 144 \u2212 64 = 80.'
  },
  {
    id: 'sample-3', subject: 'ENG101',
    question: 'Choose the correctly spelled word:',
    options: ['Occassion', 'Occasion', 'Ocassion', 'Occasssion'],
    answer: 1,
    explanation: '\u201COccasion\u201D has a double \u201Cc\u201D and a single \u201Cs\u201D.'
  },
  {
    id: 'sample-4', subject: 'PHY101',
    question: 'What is the SI unit of force?',
    options: ['Joule', 'Watt', 'Newton', 'Pascal'],
    answer: 2,
    explanation: 'Force is measured in newtons (N). Joule is energy, watt is power, pascal is pressure.'
  },
  {
    id: 'sample-5', subject: 'PAK301',
    question: 'Pakistan became an independent nation in:',
    options: ['1945', '1946', '1947', '1948'],
    answer: 2,
    explanation: 'Pakistan gained independence on 14 August 1947.'
  }
]; // v2 trigger

function SampleMcqs() {
  const [answers, setAnswers] = React.useState({});
  const answeredCount = Object.keys(answers).length;
  const score = SAMPLE_MCQS.filter((q) => answers[q.id] === q.answer).length;
  const allDone = answeredCount === SAMPLE_MCQS.length;
  const pick = (id, i) => {
    if (answers[id] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [id]: i }));
  };
  const reset = () => setAnswers({});
  const scrollToSearch = () => {
    const el = document.querySelector('.edx-search-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section aria-label="Sample practice questions">
      <div className="edx-exam-between" style={{ marginBottom: 4 }}>
        <div>
          <span className="edx-exam-eyebrow">Try a sample</span>
          <h2 style={{ margin: '4px 0 2px', fontSize: '1.3rem', fontWeight: 800 }}>Practice questions</h2>
          <p style={{ margin: 0, color: 'var(--ex-muted)', fontSize: '.9rem' }}>
            A quick taste of the MCQ Bank — tap an answer to check yourself.
          </p>
        </div>
        <span className="edx-exam-pill">{answeredCount}/{SAMPLE_MCQS.length} answered{allDone ? ' · Score ' + score + '/' + SAMPLE_MCQS.length : ''}</span>
      </div>
      <div className="edx-exam-progress" aria-hidden="true"><span style={{ width: (answeredCount / SAMPLE_MCQS.length * 100) + '%' }} /></div>
      <div className="edx-exam-stack">
        {SAMPLE_MCQS.map((q, qi) => {
          const selected = answers[q.id];
          const answered = selected !== undefined;
          return (
            <section key={q.id} className="edx-exam-card edx-exam-question" aria-label={'Sample question ' + (qi + 1)}>
              <div className="edx-exam-between">
                <span className="edx-exam-eyebrow">Question {qi + 1} of {SAMPLE_MCQS.length}</span>
                <span className="edx-exam-pill">{q.subject} · Sample</span>
              </div>
              <h3 style={{ marginTop: 10 }}>{q.question}</h3>
              <div className="edx-exam-options">
                {q.options.map((opt, i) => {
                  const state = answered && i === q.answer ? ' correct' : answered && i === selected ? ' incorrect' : '';
                  return (
                    <button key={i} type="button" disabled={answered}
                      className={'edx-exam-option' + state} aria-pressed={selected === i}
                      onClick={() => pick(q.id, i)}>
                      <span>{String.fromCharCode(65 + i)}</span>{opt}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={'edx-practice-inline-result ' + (selected === q.answer ? 'is-right' : 'is-wrong')} role="status">
                  {selected === q.answer ? 'Correct! ' : 'Incorrect. Correct answer: ' + String.fromCharCode(65 + q.answer) + '. '}
                  {q.explanation}
                </p>
              )}
            </section>
          );
        })}
      </div>
      <div className="edx-exam-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <button type="button" className="edx-exam-primary" onClick={scrollToSearch}>
          Find my subject — full bank <ChevronRight size={16} />
        </button>
        {answeredCount > 0 && (
          <button type="button" className="edx-exam-secondary" onClick={reset}>Try again</button>
        )}
      </div>
    </section>
  );
}

// PracticeSearchCard: search-first subject finder for the MCQ Bank.
// Replaces the old subject-pill catalogue: the user types a subject code,
// picks Quiz / Midterm / Finalterm, hits Search, and only that subject's
// bank loads below. Friendly guidance is built into the card itself.
function PracticeSearchCard({ searchText, onSearchTextChange, term, onTermChange, onSearch, counts, subjects, status, searchedSubject, loading, total, subjectCount }) {
  const listId = React.useId();
  const termLabel = term === "quiz" ? "Quiz" : term === "midterm" ? "Midterm" : "Finalterm";
  const termOptions = [
    { id: "quiz", label: "Quiz" },
    { id: "midterm", label: "Midterm" },
    { id: "finalterm", label: "Finalterm" },
  ];
  return (
    <section className="edx-search-card" aria-label="Find your subject and start practicing">
      <div className="edx-search-head">
        <span className="edx-exam-eyebrow"><Search size={14} /> Find your practice bank</span>
        <h2>Search your subject, start practicing</h2>
        <p>Type your <strong>subject code</strong> below (for example <strong>CS101</strong>), pick <strong>Quiz</strong>, <strong>Midterm</strong> or <strong>Finalterm</strong>, then hit <strong>Search</strong> — you will get the most important &amp; repeated MCQs for that paper, ready to practice right below.</p>
      </div>
      {(total > 0 || subjectCount > 0) && (
        <div className="edx-search-stats" aria-label="Question bank statistics">
          <span><strong>{total.toLocaleString()}</strong> MCQs</span>
          <span className="edx-search-stats-dot" aria-hidden="true" />
          <span><strong>{subjectCount}</strong> subjects</span>
          <span className="edx-search-stats-dot" aria-hidden="true" />
          <span>Quiz · Midterm · Finalterm</span>
        </div>
      )}
      <div className="edx-search-row">
        <label className="edx-search-input" aria-label="Subject code">
          <Search size={18} aria-hidden="true" />
          <input
            list={listId}
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSearch(); } }}
            placeholder="Type subject code… e.g. CS101"
            maxLength={12}
            autoComplete="off"
          />
          <datalist id={listId}>{subjects.map((s) => <option value={s} key={s} />)}</datalist>
        </label>
        <button type="button" className="edx-exam-primary edx-search-btn" onClick={onSearch}>
          <Search size={17} aria-hidden="true" /> Search
        </button>
      </div>
      <div className="edx-search-terms" role="group" aria-label="Choose Quiz, Midterm or Finalterm">
        {termOptions.map(({ id, label }) => (
          <button key={id} type="button" className={term === id ? "active" : ""} onClick={() => onTermChange(id)} aria-pressed={term === id}>
            <span className="edx-search-term-label">{label}</span>
            <span className="edx-search-term-count">{loading ? "…" : (counts[id] || 0)}</span>
          </button>
        ))}
      </div>
      {status === "invalid" && (
        <p className="edx-exam-alert" role="alert">Please type a valid subject code first — something like <strong>CS101</strong>, <strong>MGT201</strong> or <strong>ENG301</strong>.</p>
      )}
      {status === "found" && searchedSubject && (
        <div className="edx-search-found" role="status">
          <span className="edx-search-found-icon"><Check size={16} aria-hidden="true" /></span>
          <div>
            <strong>{searchedSubject} · {termLabel}</strong>
            <span>Your most important &amp; repeated MCQs are loading below — good luck!</span>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ExamPrepHub({ user, initialTab = "mcqs", adminWorkspace = false, isDark = false }) {
  // Admin tools are never part of the public Exam Prep module. Even an old
  // persisted Firebase admin identity cannot reveal them on ?page=exam-prep.
  const showAdmin = adminWorkspace === true && isAdmin(user);
  const [tab, setTab] = useState(() => {
    if (adminWorkspace) return initialTab === "admin" ? "admin" : "mcqs";
    return detectSectionFromUrl() || 'mcqs';
  });
  useEffect(() => {
    if (adminWorkspace) return;
    const syncSection = () => {
      const requested = detectSectionFromUrl();
      if (requested) setTab(requested);
    };
    window.addEventListener('popstate', syncSection);
    window.addEventListener('edunexus:navigation', syncSection);
    return () => { window.removeEventListener('popstate', syncSection); window.removeEventListener('edunexus:navigation', syncSection); };
  }, [adminWorkspace]);
  useEffect(() => {
    if (!showAdmin && tab === "admin") setTab("mcqs");
  }, [showAdmin, tab]);
  const initialChoice = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stored = JSON.parse(window.localStorage.getItem('edunexus:exam:last-selection:v1') || 'null');
      // Subject/term can arrive as query params (?page=exam-prep&subject=CS609)
      // or as pretty path params (/exam-prep/CS609/Finalterm); query wins.
      const pathParams = routeParamsFromPath(window.location.pathname);
      const code = courseCode(params.get('subject') || pathParams.subject || stored?.subject || '');
      const category = (params.get('term') || pathParams.term || stored?.term || '').toLowerCase();
      const explicitSubject = courseCode(params.get('subject') || pathParams.subject || '');
      return { subject: validCourse(code) ? code : 'CS101',
        term: EXAM_CATEGORIES.includes(category) ? category : 'finalterm',
        explicit: validCourse(explicitSubject) };
    } catch (_) { return { subject:'CS101', term:'finalterm', explicit:false }; }
  };
  const [choice] = useState(initialChoice);
  const [subject, setSubject] = useState(choice.subject);
  const [term, setTerm] = useState(choice.term);
  // Search-first UI state: the text field is independent until Search is hit.
  const [searchText, setSearchText] = useState(choice.explicit ? choice.subject : "");
  const [searchStatus, setSearchStatus] = useState(null); // null | 'invalid' | 'found' (bank always loads from the primary store)
  const [searchedSubject, setSearchedSubject] = useState(choice.explicit ? choice.subject : "");
  const [catalog, setCatalog] = useState({ subjects: [], bySubject: {}, total:0 });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const userPickedFilter = useRef(false);
  const subjectRef = useRef(subject);
  const termRef = useRef(term);
  subjectRef.current = subject; termRef.current = term;
  useEffect(() => {
    if (adminWorkspace && tab === 'admin') { setCatalogLoading(false); return; }
    let legacyUnsub = null;
    const applyCatalog = (next) => {
      setCatalog(next); setCatalogLoading(false); setCatalogError('');
      // Search-first UX: never auto-select a published subject on page load.
      // Deep links still keep their explicit subject/term; normal visits wait for Search.
      if (choice.explicit && !userPickedFilter.current) {
        // Explicit subject (deep link / shared URL) always attempts the load
        // from the primary store; the catalogue cache never blocks it.
        setSearchStatus("found");
        userPickedFilter.current = true;
      }
    };
    // Legacy fallback: scan the first EXAM_SUBJECT_LIMIT documents. Kept for
    // deployments where the denormalized counts document has never been
    // written (or cannot be read); nothing about its behaviour changed.
    // Quota fix 2026-09-30: one-time cached fetch instead of live listeners.
    // Catalogue counts are display-only badges (never gate real data).
    const CATALOG_CACHE = "edx-exam-catalog-cache-v1";
    let live = true;
    (async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE) || "null");
        if (cached && Date.now() - cached.ts < 600000 && cached.catalog) {
          if (live) applyCatalog(cached.catalog);
          return;
        }
      } catch (_) {}
      try {
        // Primary: Supabase exam_catalog table (one cheap query, always fresh
        // after an admin refresh). Falls back to the legacy Firestore document.
        let catalog = null;
        try {
          const { bySubject } = await readCatalogFromSupabase();
          if (bySubject && Object.keys(bySubject).length) catalog = catalogFromCounts({ bySubject });
        } catch (_) { /* fall through to Firestore */ }
        if (!live) return;
        if (!catalog) {
          const snapshot = await getDoc(doc(db, ...ROOT, 'meta', 'examCatalog'));
          const hasCounts = !!snapshot && typeof snapshot.exists === 'function' && snapshot.exists();
          if (hasCounts) catalog = catalogFromCounts(snapshot.data());
        }
        if (!live) return;
        if (!catalog) {
          // Legacy fallback: single scan (no persistent listener).
          const legacy = await getDocs(query(col('examMcqs'), limit(EXAM_SUBJECT_LIMIT)));
          if (!live) return;
          catalog = publishedExamCatalog(legacy.docs);
        }
        applyCatalog(catalog);
        try { localStorage.setItem(CATALOG_CACHE, JSON.stringify({ ts: Date.now(), catalog })); } catch (_) {}
      } catch (error) {
        if (!live) return;
        setCatalogLoading(false);
        setCatalogError(error?.code === 'permission-denied'
          ? 'Published question catalogue is blocked by Firestore read rules.'
          : 'Could not load the published course catalogue. Refresh to try again.');
      }
    })();
    return () => { live = false; };
  }, [adminWorkspace, tab]);
  const selectSubject = value => { userPickedFilter.current = true; setSubject(courseCode(value)); };
  const selectTerm = value => { userPickedFilter.current = true; setTerm(value); };
  // Search button: validate the typed code, then load exactly that subject.
  // The bank always loads from the primary question store (Supabase) — the
  // Firestore catalogue is only a count cache for the badges and may lag a
  // fresh import, so it never blocks a search.
  const runSubjectSearch = (nextTerm) => {
    const code = courseCode(searchText);
    if (!validCourse(code)) { setSearchStatus("invalid"); return; }
    const activeTerm = nextTerm || termRef.current;
    userPickedFilter.current = true;
    setSubject(code);
    setSearchText(code);
    setSearchedSubject(code);
    setSearchStatus("found");
    window.setTimeout(() => {
      const el = document.querySelector("#edx-exam-hub .edx-practice-toolbar") || document.querySelector("#edx-exam-hub .edx-exam-tabs");
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };
  // Term buttons inside the search card: switch term and reload that bank.
  // Badge counts come from the catalogue cache and may lag a fresh import —
  // they never block loading.
  const handleSearchTerm = (value) => {
    selectTerm(value);
    termRef.current = value;
    if (searchedSubject) setSearchStatus("found");
  };
  const searchCounts = catalog.bySubject[searchedSubject || subject] || { quiz: 0, midterm: 0, finalterm: 0 };
  useEffect(() => {
    if (!validCourse(subject) || !EXAM_CATEGORIES.includes(term)) return;
    try { window.localStorage.setItem('edunexus:exam:last-selection:v1', JSON.stringify({ subject, term })); }
    catch (_) {}
  }, [subject, term]);
  const availableCounts = catalog.bySubject[subject] || { quiz: 0, midterm: 0, finalterm: 0 };
  const catalogSubjects = [...new Set([...catalog.subjects, ...SUBJECTS, subject])].filter(Boolean);

  const changeTab = (next) => {
    if (next === "admin" && !showAdmin) return;
    if (next === "reviews" && term === "quiz") selectTerm("midterm");
    setTab(next);
    // Keep the address bar on the dedicated page URL when switching between
    // the top-level pages (not subject-specific share links).
    try {
      const path = window.location.pathname || '';
      const isTopLevel = path === '/mcq-bank' || path === '/paper-reviews'
        || path === '/exam-prep' || path === '/exam-prep/';
      if (isTopLevel && (next === 'mcqs' || next === 'reviews')) {
        const target = next === 'mcqs' ? '/mcq-bank' : '/paper-reviews';
        if (path !== target) {
          window.history.pushState({}, '', target);
          window.dispatchEvent(new Event('edunexus:navigation'));
        }
      }
    } catch (_) {}
  };
  return <div className={"edx-exam" + (isDark ? " edx-exam-dark" : "")} id="edx-exam-hub">
    {tab === "mcqs" && <><section className="edx-exam-hero"><div><span className="edx-exam-hero-tag"><GraduationCap size={14} /> MCQ Bank</span><h1>Practice smarter. Prepare with confidence.</h1><p>Type your subject code in the search box below, pick Quiz, Midterm or Finalterm, and hit Search — practice the most important &amp; repeated MCQs for your paper.</p><div className="edx-exam-hero-links"><button onClick={() => { const el = document.querySelector(".edx-search-card"); if (el) el.scrollIntoView({behavior:"smooth",block:"start"}); }}>Find my subject <ChevronRight size={16} /></button></div></div><GraduationCap size={68} aria-hidden="true" /></section>
    {!adminWorkspace && <PracticeSearchCard searchText={searchText} onSearchTextChange={setSearchText} term={term} onTermChange={handleSearchTerm} onSearch={() => runSubjectSearch()} counts={searchCounts} subjects={catalogSubjects} status={searchStatus} searchedSubject={searchedSubject} loading={catalogLoading} total={catalog.total} subjectCount={catalog.subjects.length} />}
    {catalogError && <p className="edx-exam-alert" role="alert">{catalogError}</p>}</>}
    <nav className="edx-exam-tabs" aria-label="Exam preparation tools">
      {[["mcqs", "MCQ Bank", "Practice quizzes"], ["reviews", "Paper Reviews", "Read & share"], ["files", "Study Files", "Notes & papers"], ...(showAdmin ? [["admin", "Admin tools", "Manage"]] : [])].map(([id, label, hint]) => <button key={id} type="button" className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => changeTab(id)} title={hint}><span>{label}</span><small>{hint}</small></button>)}
    </nav>
    {((tab === "mcqs" && searchedSubject) || tab === "reviews") && <ShareBar tab={tab} subject={subject} term={term} />}
    {tab === "mcqs" && searchedSubject && searchStatus === "found" && <React.Suspense fallback={<div className="edx-exam-card" role="status">Loading practice workspace…</div>}><ExamMcqPractice user={user} subject={subject} term={term} subjects={[searchedSubject]} onSubjectChange={selectSubject} categoryCounts={availableCounts} onTermChange={selectTerm}/></React.Suspense>}
    {tab === "mcqs" && !searchedSubject && <SampleMcqs />}
    {tab === "reviews" && <React.Suspense fallback={<div role="status" className="edx-exam-card">Loading paper reviews…</div>}><ExamPaperCommunity user={user} subject={subject} term={term} onPublished={(code, examTerm) => { setSubject(code); setTerm(examTerm); }} /></React.Suspense>}
    {tab === "files" && <StudyFiles subject={subject} onSubjectChange={selectSubject} subjects={catalogSubjects} />}
    {showAdmin && tab === "admin" && <AdminTools user={user} onView={(code, examType) => { selectSubject(code); selectTerm(examType); setTab("mcqs"); }} />}
    <section className="edx-exam-seo" aria-label="About VU exam preparation"><h2>Free VU MCQ Practice, Paper Reviews and Study Files</h2><div className="edx-exam-seo-text"><p>EduNexus Exam Prep is the most comprehensive free practice platform for Virtual University students. Our MCQ bank contains thousands of solved multiple-choice questions across all major VU subjects — from CS101 and MTH301 to ENG201 and PAK301. Each question includes the correct answer and a detailed explanation, helping you understand the concept instead of just memorizing.</p><p>Choose your subject, select Midterm or Finalterm, and start practicing instantly. Our practice mode simulates real VU exam conditions with timed quizzes, instant scoring, and progress tracking. You can practice all available questions or customize the count to fit your study session. Every attempt is saved, so you can review your mistakes and focus on weak areas.</p><p>Beyond MCQs, explore real paper reviews shared by VU students who recently appeared in exams. These first-hand experiences reveal which topics appeared, how difficult the paper was, and what to prioritize. Combined with our study files library of handouts and solved papers, you get a complete exam preparation system — all free, all in one place.</p></div></section>
    <p className="edx-exam-disclaimer">EduNexus is an independent study platform, not affiliated with Virtual University. Shared reviews and study materials are not official exam papers.</p>
  </div>;
}
