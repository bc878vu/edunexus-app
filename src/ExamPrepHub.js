import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { ChevronRight, FileText, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { db } from "./firebase-client";
import { validateMcq } from "./examMcqImport";
import { adminPanelAccess } from './adminSession';

import "./exam-prep-hub.css";
const ExamPaperCommunity = React.lazy(() => import("./ExamPaperCommunity"));
const McqBulkImporter = React.lazy(() => import("./McqBulkImporter"));
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
const EMPTY_MCQ = { subject: "CS101", term: "finalterm", question: "", options: ["", "", "", ""], answer: 0, explanation: "" };

const databaseReadError = (error, resource) => error?.code === "permission-denied"
  ? `${resource} temporarily unavailable: the database denied access. The website administrator must publish the updated Firestore rules.`
  : `${resource} could not load. Please check your connection and retry.`;

function CourseSelector({ value, onChange }) {
  const listId = React.useId();
  return <label className="edx-exam-field">Subject code
    <input list={listId} value={value} onChange={(event) => onChange(courseCode(event.target.value))} placeholder="e.g. CS201" maxLength={12} />
    <datalist id={listId}>{SUBJECTS.map((s) => <option value={s} key={s} />)}</datalist>
  </label>;
}

function TermSelector({ value, onChange, includeQuiz = false }) {
  return <label className="edx-exam-field">Exam type
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {includeQuiz && <option value="quiz">Quiz</option>}<option value="midterm">Midterm</option><option value="finalterm">Finalterm</option>
    </select>
  </label>;
}

function StudyFiles({ subject }) {
  const [files, setFiles] = useState([]), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!validCourse(subject)) { setFiles([]); return; }
    let live = true; setLoading(true);
    getDocs(query(col("files"), where("subject", "==", subject), limit(30)))
      .then((snapshot) => { if (live) setFiles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).filter((f) => safeUrl(f.url || f.downloadUrl || f.fileUrl))); })
      .catch(() => { if (live) setFiles([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [subject]);
  return <section className="edx-exam-card"><div className="edx-exam-section-title"><div><span className="edx-exam-eyebrow">Existing EduNexus library</span><h2>Study files & handouts</h2><p>Available resources for {subject}. Use the Academic Hub to explore other subjects.</p></div><FileText size={26} /></div>
    {loading ? <p>Loading files…</p> : files.length ? <div className="edx-exam-files">{files.map((file) => <a key={file.id} target="_blank" rel="noopener noreferrer" href={safeUrl(file.url || file.downloadUrl || file.fileUrl)}><FileText size={18} /><span>{safe(file.name || file.title, 120) || "Study resource"}</span><ChevronRight size={16} /></a>)}</div> : <p>No linked study files for this subject yet.</p>}
    <a className="edx-exam-secondary" href="/?page=academic">Open Academic Hub <ChevronRight size={16} /></a>
  </section>;
}

function AdminTools({ user, onView }) {
  const [draft, setDraft] = useState(EMPTY_MCQ);
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    if (!isAdmin(user)) return;
    try {
      const snapshot = await getDocs(query(col("examReviewSubmissions"), limit(100)));
      setPending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)));
    } catch (_) { setMessage("Cannot load submissions. Deploy and check Firestore rules."); }
  };
  useEffect(() => { if (isAdmin(user)) void reload(); }, [user]);
  const normalize = (item) => ({ ...validateMcq(item), createdAt: serverTimestamp() });
  const addOne = async (event) => {
    event.preventDefault();
    if (!isAdmin(user)) { setMessage("Admin session expired. Please log in again."); return; }
    setBusy(true); setMessage("");
    try { await addDoc(col("examMcqs"), normalize(draft)); setDraft({ ...EMPTY_MCQ, subject: draft.subject, term: draft.term }); setMessage("MCQ published successfully."); }
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
    <form className="edx-exam-card edx-exam-form" onSubmit={addOne}><h3>Add an MCQ</h3><div className="edx-exam-form-grid"><CourseSelector value={draft.subject} onChange={(value) => setDraft((v) => ({ ...v, subject: value }))} /><TermSelector includeQuiz value={draft.term} onChange={(value) => setDraft((v) => ({ ...v, term: value }))} /></div>
      <label className="edx-exam-field">Question<textarea rows={2} maxLength={1000} required value={draft.question} onChange={(e) => setDraft((v) => ({ ...v, question: e.target.value }))} /></label>
      {draft.options.map((option, i) => <label className="edx-exam-field" key={i}>Option {String.fromCharCode(65 + i)}<input required maxLength={350} value={option} onChange={(e) => setDraft((v) => ({ ...v, options: v.options.map((x, j) => i === j ? e.target.value : x) }))} /></label>)}
      <label className="edx-exam-field">Correct option<select value={draft.answer} onChange={(e) => setDraft((v) => ({ ...v, answer: Number(e.target.value) }))}>{draft.options.map((_, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></label>
      <label className="edx-exam-field">Explanation (optional)<textarea rows={2} maxLength={1000} value={draft.explanation} onChange={(e) => setDraft((v) => ({ ...v, explanation: e.target.value }))} /></label>
      <button className="edx-exam-primary" disabled={busy}>Publish MCQ</button>
    </form>
    <React.Suspense fallback={<section className="edx-exam-card" role="status">Loading JSON importer…</section>}><McqBulkImporter user={user} onView={onView}/></React.Suspense>
    <section className="edx-exam-card edx-exam-form"><div className="edx-exam-between"><h3>Legacy pending paper reviews ({pending.filter((r) => r.status === "pending").length})</h3><button className="edx-exam-secondary" onClick={reload} disabled={busy}>Refresh</button></div>
      {pending.filter((r) => r.status === "pending").map((r) => <div className="edx-exam-pending" key={r.id}><p><strong>{safe(r.subject, 12)} · {safe(r.term, 10)} · {safe(r.examDate, 10)}</strong></p><p>{safe(r.topics, 400)}</p><p>{safe(r.summary, 1500)}</p><div className="edx-exam-actions"><button className="edx-exam-primary" disabled={busy} onClick={() => moderate(r, true)}>Approve</button><button className="edx-exam-secondary" disabled={busy} onClick={() => moderate(r, false)}>Reject</button></div></div>)}
      {!pending.some((r) => r.status === "pending") && <p>No pending reviews in the latest 100 submissions.</p>}
    </section>
  </div>;
}

export default function ExamPrepHub({ user, initialTab = "mcqs", adminWorkspace = false }) {
  // Admin tools are never part of the public Exam Prep module. Even an old
  // persisted Firebase admin identity cannot reveal them on ?page=exam-prep.
  const showAdmin = adminWorkspace === true && isAdmin(user);
  const [tab, setTab] = useState(() => adminWorkspace && initialTab === "admin" ? "admin" : "mcqs");
  useEffect(() => {
    if (!showAdmin && tab === "admin") setTab("mcqs");
  }, [showAdmin, tab]);
  const [subject, setSubject] = useState("CS101");
  const [term, setTerm] = useState("finalterm");
  const changeTab = (next) => {
    if (next === "admin" && !showAdmin) return;
    if (next === "reviews" && term === "quiz") setTerm("midterm");
    setTab(next);
  };
  return <div className="edx-exam" id="edx-exam-hub">
    <section className="edx-exam-hero"><div><span className="edx-exam-hero-tag"><Sparkles size={14} /> EduNexus Exam Prep</span><h1>Practice smarter. Prepare with confidence.</h1><p>Subject-wise MCQs, student-shared completed-exam experiences, and your existing study files in one focused workspace.</p><div className="edx-exam-hero-links"><button onClick={() => changeTab("mcqs")}>Practice MCQs <ChevronRight size={16} /></button><button onClick={() => changeTab("reviews")}>Paper reviews <ChevronRight size={16} /></button></div></div><GraduationCap size={68} aria-hidden="true" /></section>
    <div className="edx-exam-controls"><CourseSelector value={subject} onChange={setSubject} /><TermSelector value={term} onChange={setTerm} includeQuiz={tab === "mcqs" || tab === "admin"} /></div>
    <nav className="edx-exam-tabs" aria-label="Exam preparation tools">
      {[["mcqs", "MCQ Bank"], ["reviews", "Paper Reviews"], ["files", "Study Files"], ...(showAdmin ? [["admin", "Admin tools"]] : [])].map(([id, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => changeTab(id)}>{label}</button>)}
    </nav>
    {tab === "mcqs" && <React.Suspense fallback={<div className="edx-exam-card" role="status">Loading practice workspace…</div>}><ExamMcqPractice user={user} subject={subject} term={term} subjects={SUBJECTS} onSubjectChange={setSubject}/></React.Suspense>}
    {tab === "reviews" && <React.Suspense fallback={<div role="status" className="edx-exam-card">Loading paper reviews…</div>}><ExamPaperCommunity user={user} subject={subject} term={term} onPublished={(code, examTerm) => { setSubject(code); setTerm(examTerm); }} /></React.Suspense>}
    {tab === "files" && <StudyFiles subject={subject} />}
    {showAdmin && tab === "admin" && <AdminTools user={user} onView={(code, examType) => { setSubject(code); setTerm(examType); setTab("mcqs"); }} />}
    <p className="edx-exam-disclaimer">EduNexus is an independent study platform, not affiliated with Virtual University. Student reviews are public, student-contributed educational guidance, not official or live examination material.</p>
  </div>;
}
