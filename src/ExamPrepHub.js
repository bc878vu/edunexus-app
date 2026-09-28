import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, getDocs, limit, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { ChevronRight, FileText, GraduationCap, ShieldCheck, Sparkles, Search, BookOpen, MessageCircle, ArrowDownUp, Share2, Link2, Check } from "lucide-react";
import { db } from "./firebase-client";
import { validateMcq } from "./examMcqImport";
import { EXAM_CATEGORIES, EXAM_SUBJECT_LIMIT, catalogFromCounts, firstAvailableExam, publishedExamCatalog } from "./examCatalog";
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
    const unsubscribe = onSnapshot(query(col("files"), where("subject", "==", subject), limit(100)),
      (snapshot) => {
        if (!live) return;
        setFiles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((f) => safeUrl(f.url || f.downloadUrl || f.fileUrl)));
        setLoading(false);
      },
      () => { if (live) { setError('Study files could not load. Please try again.'); setLoading(false); } });
    return () => { live = false; unsubscribe(); };
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
          <a className="edx-exam-secondary" rel="noopener noreferrer" href={safeUrl(file.url || file.downloadUrl || file.fileUrl)}>Open <ChevronRight size={16}/></a>
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
      <a className="edx-exam-primary" href={'/?page=exam-prep&subject=' + encodeURIComponent(lastPublished.subject) + '&term=' + encodeURIComponent(lastPublished.term)} rel="noopener noreferrer">Open published {lastPublished.subject} {lastPublished.term} quiz <ChevronRight size={16}/></a>
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
// with the selected subject & term via copy-link or WhatsApp.
function ShareBar({ tab, subject, term }) {
  const [copied, setCopied] = React.useState(false);
  const tabLabel = tab === "mcqs" ? "MCQ Bank" : tab === "reviews" ? "Paper Reviews" : "Study Files";
  const termLabel = term === "quiz" ? "Quiz" : term === "midterm" ? "Midterm" : "Finalterm";
  const shareUrl = "https://edunexus.dpdns.org/?page=exam-prep&section=" + tab + "&subject=" + encodeURIComponent(subject) + "&term=" + encodeURIComponent(term);
  const shareText = subject + " " + termLabel + " " + tabLabel + " on EduNexus";
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
    <div className="edx-share-bar" role="group" aria-label={"Share this " + tabLabel}>
      <span className="edx-share-bar-label"><Share2 size={15} /> Share this {tabLabel}</span>
      <span className="edx-share-bar-subject">{subject} · {termLabel}</span>
      <button type="button" onClick={copyLink} className="edx-share-bar-btn" aria-label="Copy share link">
        {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? "Copied!" : "Copy link"}
      </button>
      <a href={whatsAppUrl} rel="noopener noreferrer" className="edx-share-bar-btn edx-share-bar-wa" aria-label="Share on WhatsApp">
        <MessageCircle size={16} /> WhatsApp
      </a>
    </div>
  );
}

export default function ExamPrepHub({ user, initialTab = "mcqs", adminWorkspace = false, isDark = false }) {
  // Admin tools are never part of the public Exam Prep module. Even an old
  // persisted Firebase admin identity cannot reveal them on ?page=exam-prep.
  const showAdmin = adminWorkspace === true && isAdmin(user);
  const [tab, setTab] = useState(() => {
    if (adminWorkspace) return initialTab === "admin" ? "admin" : "mcqs";
    const requested = new URLSearchParams(window.location.search).get('section');
    return ['mcqs', 'reviews', 'files'].includes(requested) ? requested : 'mcqs';
  });
  useEffect(() => {
    if (adminWorkspace) return;
    const syncSection = () => {
      const requested = new URLSearchParams(window.location.search).get('section');
      if (['mcqs', 'reviews', 'files'].includes(requested)) setTab(requested);
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
      return { subject: validCourse(code) ? code : 'CS101',
        term: EXAM_CATEGORIES.includes(category) ? category : 'finalterm' };
    } catch (_) { return { subject:'CS101', term:'finalterm' }; }
  };
  const [choice] = useState(initialChoice);
  const [subject, setSubject] = useState(choice.subject);
  const [term, setTerm] = useState(choice.term);
  const [catalog, setCatalog] = useState({ subjects: [], bySubject: {}, total:0 });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  // True while the catalogue comes from the denormalized meta/examCatalog
  // document (exact totals); false while the legacy document scan is in use.
  const [catalogExact, setCatalogExact] = useState(false);
  const userPickedFilter = useRef(false);
  const subjectRef = useRef(subject);
  const termRef = useRef(term);
  subjectRef.current = subject; termRef.current = term;
  useEffect(() => {
    if (adminWorkspace && tab === 'admin') { setCatalogLoading(false); return; }
    let legacyUnsub = null;
    const applyCatalog = (next, exact) => {
      setCatalog(next); setCatalogLoading(false); setCatalogError(''); setCatalogExact(exact);
      // On first visit, choose a combination that actually contains published
      // questions; never silently override a user's later manual choice.
      if (!userPickedFilter.current && next.total) {
        const available = firstAvailableExam(next, subjectRef.current, termRef.current);
        if (available) {
          subjectRef.current = available.subject; termRef.current = available.term;
          setSubject(available.subject); setTerm(available.term);
        }
        userPickedFilter.current = true;
      }
    };
    // Legacy fallback: scan the first EXAM_SUBJECT_LIMIT documents. Kept for
    // deployments where the denormalized counts document has never been
    // written (or cannot be read); nothing about its behaviour changed.
    const startLegacyCatalog = () => {
      if (legacyUnsub) return;
      const source = query(col('examMcqs'), limit(EXAM_SUBJECT_LIMIT));
      legacyUnsub = onSnapshot(source, snapshot => {
        applyCatalog(publishedExamCatalog(snapshot.docs), false);
      }, error => {
        setCatalogLoading(false);
        setCatalogError(error?.code === 'permission-denied'
          ? 'Published question catalogue is blocked by Firestore read rules.'
          : 'Could not load the published course catalogue. Refresh to try again.');
      });
    };
    const stopLegacyCatalog = () => { if (legacyUnsub) { legacyUnsub(); legacyUnsub = null; } };
    // Fast path: the admin import/manage tools maintain exact per-subject
    // counts in one document (see src/examCatalogCounts.js).
    const unsubscribe = onSnapshot(doc(db, ...ROOT, 'meta', 'examCatalog'), snapshot => {
      // Defensive: a non-document snapshot (or a snapshot without exists())
      // means the counts doc is unavailable — use the legacy scan.
      const hasCounts = !!snapshot && typeof snapshot.exists === 'function' && snapshot.exists();
      if (!hasCounts) { startLegacyCatalog(); return; }
      stopLegacyCatalog();
      applyCatalog(catalogFromCounts(snapshot.data()), true);
    }, () => { startLegacyCatalog(); });
    return () => { stopLegacyCatalog(); unsubscribe(); };
  }, [adminWorkspace, tab]);
  const selectSubject = value => { userPickedFilter.current = true; setSubject(courseCode(value)); };
  const selectTerm = value => { userPickedFilter.current = true; setTerm(value); };
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
  };
  return <div className={"edx-exam" + (isDark ? " edx-exam-dark" : "")} id="edx-exam-hub">
    {tab === "mcqs" && <><section className="edx-exam-hero"><div><span className="edx-exam-hero-tag"><GraduationCap size={14} /> MCQ Bank</span><h1>Practice smarter. Prepare with confidence.</h1><p>Choose a subject, set your question count and practise at your own pace.</p><div className="edx-exam-hero-links"><button onClick={() => document.querySelector('.edx-practice-toolbar')?.scrollIntoView({behavior:'smooth',block:'start'})}>Start practising <ChevronRight size={16} /></button></div></div><GraduationCap size={68} aria-hidden="true" /></section>
    <div className="edx-exam-controls"><CourseSelector value={subject} onChange={selectSubject} subjects={catalogSubjects} /><TermSelector value={term} onChange={selectTerm} includeQuiz /></div></>}
    {tab === "mcqs" && !adminWorkspace && <section className="edx-exam-catalog" aria-label="Published quiz and exam categories">
      <div className="edx-exam-catalog-head"><strong>Published practice</strong><span>{catalogLoading ? 'Checking published questions…' : catalog.total ? catalog.total + (catalogExact ? '' : '+') + ' questions across ' + catalog.subjects.length + ' subject(s)' : (catalogExact ? 'No published questions yet' : 'No published questions detected in the first ' + EXAM_SUBJECT_LIMIT + ' records')}</span></div>
      {!!catalog.subjects.length && <div className="edx-exam-catalog-subjects" role="group" aria-label="Available subject categories">
        {catalog.subjects.map(code => <button type="button" key={code} onClick={() => { userPickedFilter.current = true; setSubject(code); const best = firstAvailableExam(catalog, code, term); if (best) setTerm(best.term); }} className={subject === code ? 'active' : ''}>{code}</button>)}
      </div>}
      <div className="edx-exam-catalog-categories" role="group" aria-label="Exam type and published question counts">
        {EXAM_CATEGORIES.map(category => <button type="button" key={category} className={term === category ? 'active' : ''} onClick={() => selectTerm(category)}>{category === 'quiz' ? 'Quiz' : category === 'midterm' ? 'Midterm' : 'Finalterm'} <span>{availableCounts[category] || 0}</span></button>)}
      </div>
      {catalogError && <p className="edx-exam-alert" role="alert">{catalogError} You can still type a subject code and retry the practice view.</p>}
      {!catalogExact && catalog.total >= EXAM_SUBJECT_LIMIT && <p className="edx-exam-catalog-note">The subject catalogue shows the first {EXAM_SUBJECT_LIMIT} published records. Enter another subject code manually if it is not listed.</p>}
    </section>}
    <nav className="edx-exam-tabs" aria-label="Exam preparation tools">
      {[["mcqs", "MCQ Bank", "Practice quizzes"], ["reviews", "Paper Reviews", "Read & share"], ["files", "Study Files", "Notes & papers"], ...(showAdmin ? [["admin", "Admin tools", "Manage"]] : [])].map(([id, label, hint]) => <button key={id} type="button" className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => changeTab(id)} title={hint}><span>{label}</span><small>{hint}</small></button>)}
    </nav>
    {(tab === "mcqs" || tab === "reviews") && <ShareBar tab={tab} subject={subject} term={term} />}
    {tab === "mcqs" && <React.Suspense fallback={<div className="edx-exam-card" role="status">Loading practice workspace…</div>}><ExamMcqPractice user={user} subject={subject} term={term} subjects={catalogSubjects} onSubjectChange={selectSubject} categoryCounts={availableCounts} onTermChange={selectTerm}/></React.Suspense>}
    {tab === "reviews" && <React.Suspense fallback={<div role="status" className="edx-exam-card">Loading paper reviews…</div>}><ExamPaperCommunity user={user} subject={subject} term={term} onPublished={(code, examTerm) => { setSubject(code); setTerm(examTerm); }} /></React.Suspense>}
    {tab === "files" && <StudyFiles subject={subject} onSubjectChange={selectSubject} subjects={catalogSubjects} />}
    {showAdmin && tab === "admin" && <AdminTools user={user} onView={(code, examType) => { selectSubject(code); selectTerm(examType); setTab("mcqs"); }} />}
    <p className="edx-exam-disclaimer">EduNexus is an independent study platform, not affiliated with Virtual University. Shared reviews and study materials are not official exam papers.</p>
  </div>;
}
