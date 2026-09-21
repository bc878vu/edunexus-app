import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, GraduationCap, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { db } from "./firebase-client";
import "./exam-prep-hub.css";

const ROOT = ["artifacts", "edunexus-live", "public", "data"];
const col = (name) => collection(db, ...ROOT, name);
const safe = (value, max = 3000) => String(value || "").trim().slice(0, max);
const courseCode = (value) => safe(value, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
const validCourse = (value) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(value);
const isAdmin = (user) => user && user.email === "veducator4@gmail.com" && user.emailVerified === true;
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
const SUBJECTS = ["CS101", "CS201", "CS301", "CS302", "CS304", "CS401", "CS403", "CS510", "CS511", "CS601", "CS604", "CS610", "ENG101", "ENG201", "MGT101", "MGT201", "MTH101", "MTH202", "MTH601", "PHY101", "STA301"];
const EMPTY_MCQ = { subject: "CS101", term: "finalterm", question: "", options: ["", "", "", ""], answer: 0, explanation: "" };
const EMPTY_REVIEW = { subject: "CS101", term: "finalterm", examDate: "", difficulty: "moderate", topics: "", summary: "" };

const databaseReadError = (error, resource) => error?.code === "permission-denied"
  ? `${resource} temporarily unavailable: the database denied access. The website administrator must publish the updated Firestore rules.`
  : `${resource} could not load. Please check your connection and retry.`;

function CourseSelector({ value, onChange }) {
  return <label className="edx-exam-field">Subject code
    <input list="edx-exam-subjects" value={value} onChange={(event) => onChange(courseCode(event.target.value))} placeholder="e.g. CS201" maxLength={12} />
    <datalist id="edx-exam-subjects">{SUBJECTS.map((s) => <option value={s} key={s} />)}</datalist>
  </label>;
}

function TermSelector({ value, onChange }) {
  return <label className="edx-exam-field">Exam type
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="midterm">Midterm</option><option value="finalterm">Finalterm</option>
    </select>
  </label>;
}

function QuestionCard({ item, index, total, selected, onSelect, onNext, onPrevious }) {
  const answered = selected !== undefined;
  return <section className="edx-exam-card edx-exam-question" aria-label="Practice question">
    <div className="edx-exam-between"><span className="edx-exam-eyebrow">Question {index + 1} of {total}</span><span className="edx-exam-pill">{item.subject} · {item.term}</span></div>
    <div className="edx-exam-progress"><span style={{ width: ((index + 1) / total * 100) + "%" }} /></div>
    <h3>{item.question}</h3>
    <div className="edx-exam-options">{item.options.map((option, i) => {
      const result = answered && i === item.answer ? " correct" : answered && i === selected ? " incorrect" : "";
      return <button className={"edx-exam-option" + result} key={i} disabled={answered} onClick={() => onSelect(i)}><span>{String.fromCharCode(65 + i)}</span>{option}</button>;
    })}</div>
    {answered && <div className="edx-exam-feedback" role="status"><strong>{selected === item.answer ? "Correct answer" : "Review this answer"}</strong><p>{item.explanation || "Correct option: " + String.fromCharCode(65 + item.answer) + ". Review your notes for more detail."}</p></div>}
    <div className="edx-exam-between edx-exam-actions"><button className="edx-exam-secondary" onClick={onPrevious} disabled={index === 0}><ChevronLeft size={16} /> Previous</button><button className="edx-exam-primary" onClick={onNext} disabled={!answered || index === total - 1}>Next <ChevronRight size={16} /></button></div>
  </section>;
}

function McqBank({ subject, term, user }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!validCourse(subject)) { setQuestions([]); setError("Enter a valid subject code."); return; }
    let live = true;
    setLoading(true); setError(""); setFinished(false); setAnswers({}); setIndex(0);
    getDocs(query(col("examMcqs"), where("subject", "==", subject), limit(100)))
      .then((snap) => {
        if (!live) return;
        const available = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((q) =>
          q.term === term && Array.isArray(q.options) && q.options.length === 4 &&
          Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && q.question
        );
        setQuestions(shuffle(available).slice(0, 25));
      })
      .catch((error) => { if (live) setError(databaseReadError(error, "MCQ bank")); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [subject, term, refresh]);
  const score = useMemo(() => questions.reduce((n, q) => n + (answers[q.id] === q.answer ? 1 : 0), 0), [questions, answers]);
  return <div className="edx-exam-stack">
    <div className="edx-exam-section-title"><div><span className="edx-exam-eyebrow">Practice at your own pace</span><h2>Subject-wise MCQs</h2><p>Instant answers, explanations and a results summary. Works on mobile without any extension.</p></div><BookOpen size={28} /></div>
    {loading && <div className="edx-exam-card" role="status">Loading practice questions…</div>}
    {error && <div className="edx-exam-alert" role="alert">{error} <button type="button" className="edx-exam-secondary" onClick={() => setRefresh((n) => n + 1)}>Retry</button></div>}
    {!loading && !error && questions.length === 0 && <div className="edx-exam-card edx-exam-empty"><BookOpen size={30} /><h3>No published MCQs for {subject} ({term}) yet</h3><p>Questions appear here after an administrator adds original or appropriately licensed study material. No unverified question count is shown.</p>{isAdmin(user) && <p>Open the Admin tools tab to add the first question.</p>}</div>}
    {!loading && questions.length > 0 && !finished && <><div className="edx-exam-between"><span className="edx-exam-pill">{Object.keys(answers).length}/{questions.length} answered</span><span className="edx-exam-pill">Current score: {score}</span></div><QuestionCard item={questions[index]} index={index} total={questions.length} selected={answers[questions[index].id]} onSelect={(option) => setAnswers((prev) => ({ ...prev, [questions[index].id]: option }))} onPrevious={() => setIndex((i) => Math.max(0, i - 1))} onNext={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} /><button className="edx-exam-secondary" onClick={() => setFinished(true)}>Finish practice and see results</button></>}
    {!loading && questions.length > 0 && finished && <div className="edx-exam-card edx-exam-empty"><CheckCircle2 size={36} /><h3>Your practice results</h3><p className="edx-exam-score">{score} / {questions.length}</p><p>{Object.keys(answers).length} questions answered. Unanswered questions count as incorrect.</p><button className="edx-exam-primary" onClick={() => setRefresh((n) => n + 1)}>Start another practice session</button></div>}
  </div>;
}

function ReviewForm({ user, subject, term }) {
  const [form, setForm] = useState({ ...EMPTY_REVIEW, subject, term });
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState({ busy: false, message: "", error: false });
  useEffect(() => { setForm((prev) => ({ ...prev, subject, term })); }, [subject, term]);
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!user) { setState({ busy: false, message: "Sign in to submit a review.", error: true }); return; }
    if (!validCourse(form.subject) || !/^\d{4}-\d{2}-\d{2}$/.test(form.examDate) || !safe(form.summary, 1500) || !consent) {
      setState({ busy: false, message: "Complete every required field and confirm the academic-integrity notice.", error: true }); return;
    }
    if (form.examDate > new Date().toLocaleDateString("en-CA")) {
      setState({ busy: false, message: "Review dates cannot be in the future.", error: true }); return;
    }
    setState({ busy: true, message: "", error: false });
    try {
      const id = [user.uid, form.subject, form.term, form.examDate].join("_");
      await setDoc(doc(col("examReviewSubmissions"), id), {
        userId: user.uid, subject: form.subject, term: form.term, examDate: form.examDate,
        difficulty: form.difficulty, topics: safe(form.topics, 400), summary: safe(form.summary, 1500),
        status: "pending", createdAt: serverTimestamp()
      });
      setState({ busy: false, message: "Review submitted for moderation. It is not public until approved.", error: false });
      setForm((prev) => ({ ...prev, topics: "", summary: "" })); setConsent(false);
    } catch (_) {
      setState({ busy: false, message: "Submission could not be saved. You may already have submitted for this subject, exam type and date, or the new Firestore rules may not be deployed.", error: true });
    }
  };
  return <form className="edx-exam-card edx-exam-form" onSubmit={submit}>
    <h3>Share your completed-exam experience</h3><p>Help students with general topics, difficulty and preparation tips. Do not share live exam questions, screenshots or confidential material.</p>
    <div className="edx-exam-form-grid"><CourseSelector value={form.subject} onChange={(value) => update("subject", value)} /><TermSelector value={form.term} onChange={(value) => update("term", value)} />
      <label className="edx-exam-field">Exam date <input type="date" required max={new Date().toLocaleDateString("en-CA")} value={form.examDate} onChange={(event) => update("examDate", event.target.value)} /></label>
      <label className="edx-exam-field">Difficulty <select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select></label>
    </div>
    <label className="edx-exam-field">Main topics (optional) <input maxLength={400} value={form.topics} onChange={(event) => update("topics", event.target.value)} placeholder="e.g. linked lists, trees, stacks" /></label>
    <label className="edx-exam-field">Your experience and preparation advice <textarea required minLength={20} maxLength={1500} rows={4} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="Describe the exam difficulty and general areas to prepare…" /></label>
    <label className="edx-exam-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I have completed this exam and will not share confidential or active examination content.</label>
    {state.message && <p role="status" className={state.error ? "edx-exam-alert" : "edx-exam-success"}>{state.message}</p>}
    <button className="edx-exam-primary" type="submit" disabled={state.busy || !user}>{state.busy ? "Submitting…" : "Submit review for approval"}</button>
  </form>;
}

function PaperReviews({ user, subject, term }) {
  const [reviews, setReviews] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!validCourse(subject)) { setReviews([]); setLoading(false); return; }
    let live = true; setLoading(true); setError("");
    getDocs(query(col("examReviews"), where("subject", "==", subject), limit(50)))
      .then((snap) => { if (live) setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.term === term).sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))); })
      .catch((error) => { if (live) setError(databaseReadError(error, "Paper reviews")); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [subject, term, refresh]);
  return <div className="edx-exam-stack"><div className="edx-exam-section-title"><div><span className="edx-exam-eyebrow">Student community</span><h2>Completed paper reviews</h2><p>Moderated experiences from students after their exams. Reviews are not official question papers.</p></div><ClipboardList size={28} /></div>
    {loading && <div className="edx-exam-card">Loading reviews…</div>}{error && <div className="edx-exam-alert" role="alert">{error} <button type="button" className="edx-exam-secondary" onClick={() => setRefresh((n) => n + 1)}>Retry</button></div>}
    {!loading && !error && reviews.length === 0 && <div className="edx-exam-card edx-exam-empty"><ClipboardList size={28} /><h3>No approved reviews yet</h3><p>Be the first to share constructive advice after completing your paper.</p></div>}
    {reviews.map((review) => <article key={review.id} className="edx-exam-card edx-exam-review"><div className="edx-exam-between"><span className="edx-exam-pill">{review.subject} · {review.term}</span><span className="edx-exam-eyebrow">{safe(review.examDate, 10)} · {safe(review.difficulty, 20)}</span></div><h3>Exam experience</h3>{review.topics && <p><strong>Topics:</strong> {safe(review.topics, 400)}</p>}<p>{safe(review.summary, 1500)}</p><small>Student-contributed · Moderated · Not verified by Virtual University</small></article>)}
    <ReviewForm user={user} subject={subject} term={term} />
  </div>;
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

function AdminTools({ user }) {
  const [draft, setDraft] = useState(EMPTY_MCQ);
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    try {
      const snapshot = await getDocs(query(col("examReviewSubmissions"), limit(100)));
      setPending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)));
    } catch (_) { setMessage("Cannot load submissions. Deploy and check Firestore rules."); }
  };
  useEffect(() => { if (isAdmin(user)) void reload(); }, [user]);
  const normalize = (item) => {
    const subject = courseCode(item.subject);
    const term = item.term;
    const options = Array.isArray(item.options) ? item.options.map((v) => safe(v, 350)) : [];
    const answer = Number(item.answer);
    if (!validCourse(subject) || !["midterm", "finalterm"].includes(term) || !safe(item.question, 1000) || options.length !== 4 || options.some((v) => !v) || !Number.isInteger(answer) || answer < 0 || answer > 3) throw new Error("Each question needs a valid course code, exam type, question, four options and answer index 0–3.");
    return { subject, term, question: safe(item.question, 1000), options, answer, explanation: safe(item.explanation, 1000), createdAt: serverTimestamp() };
  };
  const addOne = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await addDoc(col("examMcqs"), normalize(draft)); setDraft({ ...EMPTY_MCQ, subject: draft.subject, term: draft.term }); setMessage("MCQ published successfully."); }
    catch (error) { setMessage(error.message || "MCQ could not be published."); } finally { setBusy(false); }
  };
  const importMany = async () => {
    setBusy(true); setMessage("");
    try {
      const data = JSON.parse(bulk);
      if (!Array.isArray(data) || data.length < 1 || data.length > 40) throw new Error("Provide a JSON array containing 1–40 questions per batch.");
      const items = data.map(normalize);
      const batch = writeBatch(db);
      items.forEach((item) => batch.set(doc(col("examMcqs")), item));
      await batch.commit(); setBulk(""); setMessage(items.length + " MCQs published successfully.");
    } catch (error) { setMessage(error.message || "Could not import MCQs."); } finally { setBusy(false); }
  };
  const moderate = async (review, approve) => {
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
    <form className="edx-exam-card edx-exam-form" onSubmit={addOne}><h3>Add an MCQ</h3><div className="edx-exam-form-grid"><CourseSelector value={draft.subject} onChange={(value) => setDraft((v) => ({ ...v, subject: value }))} /><TermSelector value={draft.term} onChange={(value) => setDraft((v) => ({ ...v, term: value }))} /></div>
      <label className="edx-exam-field">Question<textarea rows={2} maxLength={1000} required value={draft.question} onChange={(e) => setDraft((v) => ({ ...v, question: e.target.value }))} /></label>
      {draft.options.map((option, i) => <label className="edx-exam-field" key={i}>Option {String.fromCharCode(65 + i)}<input required maxLength={350} value={option} onChange={(e) => setDraft((v) => ({ ...v, options: v.options.map((x, j) => i === j ? e.target.value : x) }))} /></label>)}
      <label className="edx-exam-field">Correct option<select value={draft.answer} onChange={(e) => setDraft((v) => ({ ...v, answer: Number(e.target.value) }))}>{draft.options.map((_, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></label>
      <label className="edx-exam-field">Explanation (optional)<textarea rows={2} maxLength={1000} value={draft.explanation} onChange={(e) => setDraft((v) => ({ ...v, explanation: e.target.value }))} /></label>
      <button className="edx-exam-primary" disabled={busy}>Publish MCQ</button>
    </form>
    <section className="edx-exam-card edx-exam-form"><h3>Bulk import original MCQs</h3><p>Paste a JSON array (up to 40 per batch). Each entry: subject, term, question, options (four strings), answer (0–3), explanation.</p><textarea aria-label="MCQ JSON import" rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder='[{"subject":"CS101","term":"finalterm","question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}]' /><button className="edx-exam-secondary" disabled={busy || !bulk.trim()} onClick={importMany}><UploadCloud size={17} /> Import questions</button></section>
    <section className="edx-exam-card edx-exam-form"><div className="edx-exam-between"><h3>Pending paper reviews ({pending.filter((r) => r.status === "pending").length})</h3><button className="edx-exam-secondary" onClick={reload} disabled={busy}>Refresh</button></div>
      {pending.filter((r) => r.status === "pending").map((r) => <div className="edx-exam-pending" key={r.id}><p><strong>{safe(r.subject, 12)} · {safe(r.term, 10)} · {safe(r.examDate, 10)}</strong></p><p>{safe(r.topics, 400)}</p><p>{safe(r.summary, 1500)}</p><div className="edx-exam-actions"><button className="edx-exam-primary" disabled={busy} onClick={() => moderate(r, true)}>Approve</button><button className="edx-exam-secondary" disabled={busy} onClick={() => moderate(r, false)}>Reject</button></div></div>)}
      {!pending.some((r) => r.status === "pending") && <p>No pending reviews in the latest 100 submissions.</p>}
    </section>
  </div>;
}

export default function ExamPrepHub({ user, initialTab = "mcqs" }) {
  const [tab, setTab] = useState(initialTab);
  const [subject, setSubject] = useState("CS101");
  const [term, setTerm] = useState("finalterm");
  return <div className="edx-exam" id="edx-exam-hub">
    <section className="edx-exam-hero"><div><span className="edx-exam-hero-tag"><Sparkles size={14} /> EduNexus Exam Prep</span><h1>Practice smarter. Prepare with confidence.</h1><p>Subject-wise MCQs, moderated past-exam experiences, and your existing study files in one focused workspace.</p><div className="edx-exam-hero-links"><button onClick={() => setTab("mcqs")}>Practice MCQs <ChevronRight size={16} /></button><button onClick={() => setTab("reviews")}>Paper reviews <ChevronRight size={16} /></button></div></div><GraduationCap size={68} aria-hidden="true" /></section>
    <div className="edx-exam-controls"><CourseSelector value={subject} onChange={setSubject} /><TermSelector value={term} onChange={setTerm} /></div>
    <nav className="edx-exam-tabs" aria-label="Exam preparation tools">
      {[["mcqs", "MCQ Bank"], ["reviews", "Paper Reviews"], ["files", "Study Files"], ...(isAdmin(user) ? [["admin", "Admin tools"]] : [])].map(([id, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    {tab === "mcqs" && <McqBank user={user} subject={subject} term={term} />}
    {tab === "reviews" && <PaperReviews user={user} subject={subject} term={term} />}
    {tab === "files" && <StudyFiles subject={subject} />}
    {tab === "admin" && <AdminTools user={user} />}
    <p className="edx-exam-disclaimer">EduNexus is an independent study platform, not affiliated with Virtual University. Student reviews are educational guidance, not official or live examination material.</p>
  </div>;
}
