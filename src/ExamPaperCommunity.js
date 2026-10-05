import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { CalendarDays, CheckCircle2, ClipboardCopy, Clock3, ExternalLink, FileText, GraduationCap, MessageCircle, Send, Share2, ShieldAlert, Search, Users, BookOpen } from 'lucide-react';
import { db } from './firebase-client';
import { examReviewText, formatExamDate, formatExamTime, safePaperUrl, whatsAppReviewUrl, EDUNEXUS_WHATSAPP_GROUP } from './examReviewFormat';
import RichContent from './RichContent';
import './exam-paper-community.css';

const REVIEW_WORD_LIMIT = 10000;
const REVIEW_CHAR_LIMIT = 300000;
const countReviewWords = (value) => String(value || '').trim().match(/\S+/gu)?.length || 0;
const ROOT = ['artifacts', 'edunexus-live', 'public', 'data'];
const col = (name) => collection(db, ...ROOT, name);
const REVIEW_COLLECTION = 'examCommunityReviews';
const LEGACY_COLLECTION = 'examReviews';
const safe = (value, max = 10000) => String(value == null ? '' : value).trim().slice(0, max);
const courseCode = (value) => safe(value, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const validCourse = (value) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(value);
const dateValue = (value) => value && typeof value.toMillis === 'function' ? value.toMillis() : 0;
const todayLocal = () => {
  const d = new Date(), pad = (v) => String(v).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const SUBJECTS = ['CS101', 'CS201', 'CS301', 'CS302', 'CS304', 'CS401', 'CS403', 'CS510', 'CS511', 'CS601', 'CS604', 'CS610', 'ENG101', 'ENG201', 'MGT101', 'MGT111', 'MGT201', 'MGT611', 'MTH101', 'MTH202', 'MTH601', 'PHY101', 'STA301'];
const defaultForm = (subject, term) => ({
  subject: '', term, examDate: '', examTime: '', semesterSeason: 'Spring',
  semesterYear: new Date().getFullYear(), sharedBy: '', difficulty: 'moderate',
  topics: '', summary: ''
});
const readError = (error, name) => error?.code === 'permission-denied'
  ? name + ' cannot be loaded with the current database permissions. Please contact the site administrator.'
  : name + ' could not load. Check your connection and retry.';

function ReviewSubmission({ user, subject, term, reuseDraft, onPublished }) {
  const [form, setForm] = useState(() => defaultForm(subject, term));
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const listId = React.useId();
  const saving = useRef(false);
  useEffect(() => {
    setForm((prev) => ({ ...prev, term }));
  }, [subject, term]);
  useEffect(() => {
    if (!reuseDraft) return;
    setForm(prev=>({
      ...prev, subject:courseCode(reuseDraft.subject), term:reuseDraft.term,
      examDate:reuseDraft.examDate || '', difficulty:reuseDraft.difficulty || 'moderate',
      topics:reuseDraft.topics || '', summary:reuseDraft.summary || ''
    }));
    setAgreed(false);
    setNotice('Your earlier text is ready. Add the missing details and confirm before publishing it.');
    setError('');
  }, [reuseDraft]);
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const publish = async (event) => {
    event.preventDefault();
    if (saving.current) return;
    setError(''); setNotice('');
    if (!user?.uid) { setError('Please sign in to share a review.'); return; }
    const code = courseCode(form.subject);
    const name = safe(form.sharedBy, 60);
    const summary = String(form.summary || '');
    if (summary.length > REVIEW_CHAR_LIMIT || countReviewWords(summary) > REVIEW_WORD_LIMIT) {
      setError('Review must contain no more than 10,000 words and 300,000 characters.'); return;
    }
    const examMoment = new Date(form.examDate + 'T' + form.examTime + ':00');
    const futureExam = !Number.isFinite(examMoment.getTime()) || examMoment.getTime() > Date.now();
    if (!validCourse(code) || !form.examDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.examTime)
      || futureExam || name.length < 2 || summary.trim().length < 20 || summary.length > REVIEW_CHAR_LIMIT || countReviewWords(summary) > REVIEW_WORD_LIMIT
      || !['Spring', 'Fall', 'Summer'].includes(form.semesterSeason)
      || !Number.isInteger(Number(form.semesterYear)) || Number(form.semesterYear) < 2020
      || Number(form.semesterYear) > new Date().getFullYear() + 1 || !agreed) {
      setError('Complete the course, semester, your name, a completed exam date and time, at least 20 characters of feedback, and the academic-integrity confirmation.');
      return;
    }
    saving.current = true; setBusy(true);
    try {
      const id = [user.uid, code, form.term, form.examDate].join('_');
      const reviewRef = doc(col(REVIEW_COLLECTION), id);
      if ((await getDoc(reviewRef)).exists()) {
        setError('You already shared a review for this course, exam type and date. Find it in the reviews below, or contact the site administrator to correct it.');
        return;
      }
      await setDoc(reviewRef, {
        userId: user.uid, subject: code, term: form.term,
        semester: form.semesterSeason + ' ' + form.semesterYear,
        examDate: form.examDate, examTime: form.examTime,
        examAt: Timestamp.fromDate(examMoment),
        sharedBy: name, difficulty: form.difficulty,
        topics: safe(form.topics, 400), summary, createdAt: serverTimestamp(),
      });
      setNotice('Your review is now published. Students can read and share it below.');
      if (onPublished) onPublished(code, form.term);
      setForm((prev) => ({ ...defaultForm('', prev.term), semesterYear: prev.semesterYear }));
      setAgreed(false);
    } catch (err) {
      setError(err?.code === 'permission-denied'
        ? 'Publishing is blocked by the live database rules. Please ask the site administrator to publish the updated Firestore review rules. Your review text is still here.'
        : err?.code === 'unavailable' || err?.code === 'deadline-exceeded'
          ? 'Connection to the review database failed. Check your internet connection and try again; your text is still here.'
          : 'The review could not be published (' + safe(err?.code || 'unexpected error', 50) + '). Please try again; your text is still here.');
    } finally { saving.current = false; setBusy(false); }
  };
  return <section className="edx-paper-submit" aria-labelledby="edx-paper-share-title">
    <div className="edx-paper-submit-head"><span className="edx-paper-kicker"><BookOpen size={15} /> Share your experience</span><h2 id="edx-paper-share-title">How was your paper?</h2>
      <p>Help other students prepare. Write about a completed exam, the topics you remember and what helped you study. Your review appears as soon as you publish it.</p>
      <div className="edx-paper-info"><CheckCircle2 size={15} /> Your review appears right away</div>
    </div>
    <form className="edx-paper-form" onSubmit={publish}>
      <div className="edx-paper-fields">
        <label>Course code <input required list={listId} maxLength={12} placeholder="e.g. CS101" value={form.subject} onChange={(e) => update('subject', courseCode(e.target.value))} /><datalist id={listId}>{SUBJECTS.map((item) => <option key={item} value={item} />)}</datalist></label>
        <label>Exam type <select value={form.term} onChange={(e) => update('term', e.target.value)}><option value="finalterm">Finalterm</option><option value="midterm">Midterm</option></select></label>
        <label>Semester <select value={form.semesterSeason} onChange={(e) => update('semesterSeason', e.target.value)}><option>Spring</option><option>Fall</option><option>Summer</option></select></label>
        <label>Semester year <input required type="number" min="2020" max={new Date().getFullYear() + 1} value={form.semesterYear} onChange={(e) => update('semesterYear', e.target.value)} /></label>
        <label><CalendarDays size={15} /> Exam date <input type="date" required max={todayLocal()} value={form.examDate} onChange={(e) => update('examDate', e.target.value)} /></label>
        <label><Clock3 size={15} /> Exam time <input type="time" required value={form.examTime} onChange={(e) => update('examTime', e.target.value)} /></label>
        <label>Shared by (display name) <input required minLength={2} maxLength={60} autoComplete="nickname" placeholder="Your name or preferred display name" value={form.sharedBy} onChange={(e) => update('sharedBy', e.target.value)} /></label>
        <label>Exam difficulty <select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select></label>
        <label className="edx-paper-full">Main topics (optional) <input maxLength={400} placeholder="e.g. important definitions, lecture topics or general preparation tips" value={form.topics} onChange={(e) => update('topics', e.target.value)} /></label>
        <label className="edx-paper-full">Your paper experience and study tips <textarea required minLength={20} maxLength={REVIEW_CHAR_LIMIT} rows={10} placeholder="What topics came up? What would you suggest other students revise?" value={form.summary} onChange={(e) => update('summary', e.target.value)} /><span className="edx-paper-count">{countReviewWords(form.summary).toLocaleString()} / 10,000 words</span></label>
      </div>
      <label className="edx-paper-consent"><input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>I have completed this exam, and my review does not disclose confidential or active examination material. I understand that my display name and review will be publicly visible.</span></label>
      {error && <div className="edx-paper-alert" role="alert">{error}</div>}
      {notice && <div className="edx-paper-success" role="status"><CheckCircle2 size={18} /> {notice} <a href="#edx-paper-feed">View reviews</a></div>}
      <button className="edx-paper-publish" type="submit" disabled={busy || !user || !agreed}><Send size={18} /> {busy ? 'Publishing your review…' : 'Share my paper experience'}</button>
      {!user && <p className="edx-paper-hint">Waiting for a student session. Reload the page if the button remains disabled.</p>}
    </form>
  </section>;
}

// Render user text as React text nodes, preserving whitespace and linking only safe URLs.
const reviewUrlPattern = /https?:\/\/[^\s<>"']+/gi;
function renderReviewContent(value) {
  // Multiline code needs one continuous block to preserve its original indentation.
  if (String(value || '').includes(String.fromCharCode(96).repeat(3))) return <RichContent value={value}/>;
  return String(value || '').split('\n').map((line, lineIndex) => {
    const parts = [];
    let offset = 0;
    for (const match of line.matchAll(reviewUrlPattern)) {
      parts.push(<RichContent key={'text-'+offset} value={line.slice(offset, match.index)}/>);
      const raw = match[0];
      const url = raw.replace(/[.,;!?)]*$/, '');
      parts.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer nofollow ugc">{url}</a>);
      parts.push(raw.slice(url.length));
      offset = match.index + raw.length;
    }
    parts.push(<RichContent key={'tail-'+offset} value={line.slice(offset)}/>);
    return <React.Fragment key={lineIndex}>{lineIndex > 0 && <br />}{parts}</React.Fragment>;
  });
}

function ReviewCard({ review, user }) {
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const text = useMemo(() => examReviewText(review), [review]);
  const shareLink = useMemo(() => whatsAppReviewUrl(review), [review]);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setNotice('Copied with EduNexus branding, the review link and your WhatsApp group link.');
    } catch (_) { setNotice('Copy was blocked by the browser. Try WhatsApp Share or allow clipboard permission.'); }
  };
  const report = async () => {
    if (!user?.uid || working) { setNotice('Please sign in before reporting a review.'); return; }
    setWorking(true);
    try {
      await addDoc(col('feedback'), {
        userId: user.uid, category: 'exam-review-report',
        reviewId: review.id, reviewCollection: review.collectionName,
        reason: 'Please check this public exam review for inappropriate or confidential content.',
        createdAt: serverTimestamp()
      });
      setNotice('Thanks for your report. We will review it.');
    } catch (_) { setNotice('Report could not be sent. Please try again.'); }
    finally { setWorking(false); }
  };
  const legacy = review.collectionName === LEGACY_COLLECTION;
  const paperUrl = safePaperUrl(review);
  return <article className="edx-paper-card">
    <div className="edx-paper-card-head"><div className="edx-paper-course"><GraduationCap size={18} /><strong>{safe(review.subject, 12)}</strong><span>{review.term === 'midterm' ? 'Midterm' : 'Finalterm'}{review.semester ? ' · ' + safe(review.semester, 20) : ''}</span></div><span className="edx-paper-chip">{legacy ? 'Previous paper' : 'Shared experience'}</span></div>
    <div className="edx-paper-card-meta"><span><CalendarDays size={15} /> {formatExamDate(review.examDate)}</span>{review.examTime && <span><Clock3 size={15} /> {formatExamTime(review.examTime)}</span>}<span><Users size={15} /> {safe(review.sharedBy, 60) || 'Student'}</span><span className="edx-paper-difficulty">{safe(review.difficulty, 20) || 'Unrated'}</span></div>
    <div className="edx-paper-content"><strong><FileText size={17} /> Paper content & preparation advice</strong>{review.topics && <p className="edx-paper-topics">Topics: {safe(review.topics, 400)}</p>}<p>{renderReviewContent(review.summary)}</p>{paperUrl && <a className="edx-paper-file-link" href={paperUrl} target="_blank" rel="noopener noreferrer"><FileText size={16}/> View shared paper ({safe(review.paperName,95) || 'PDF or image'}) <ExternalLink size={14}/></a>}</div>
    <div className="edx-paper-card-bottom"><span>Shared by a student</span><div className="edx-paper-card-actions"><button type="button" onClick={copy} className="edx-paper-copy"><ClipboardCopy size={16} /> Copy</button><a href={shareLink} target="_blank" rel="noopener noreferrer" className="edx-paper-whatsapp"><Share2 size={16} /> Share on WhatsApp</a></div></div>
    <div className="edx-paper-card-secondary"><button type="button" onClick={report} disabled={working}><ShieldAlert size={14} /> Report</button></div>
    {notice && <p className="edx-paper-notice" role="status">{notice}</p>}
  </article>;
}


function EarlierSubmissions({ user, onReuse }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.uid) { setItems([]); setStatus('signed-out'); return; }
    setItems([]); setStatus('loading'); setError('');
    // Earlier versions saved submissions for moderation rather than publishing
    // them. They can only be listed by the original Firebase account.
    return onSnapshot(query(col('examReviewSubmissions'), where('userId', '==', user.uid), limit(100)),
      snap => { setItems(snap.docs.map(d => ({ id:d.id,...d.data() }))); setStatus('loaded'); },
      err => { setStatus('error'); setError(err?.code === 'permission-denied'
        ? 'Previous submissions cannot be loaded until the updated review permissions are published.'
        : 'Could not check your earlier submissions. Please try again later.'); });
  }, [user?.uid]);
  if (status === 'signed-out' || (status === 'loaded' && !items.length)) return null;
  return <section className="edx-paper-earlier" aria-labelledby="edx-earlier-title">
    <h2 id="edx-earlier-title">Your earlier submissions</h2>
    <p>Reviews sent through the older submission form may still be awaiting publication. Only you can see those drafts here.</p>
    {status === 'loading' && <p role="status">Checking earlier submissions…</p>}
    {error && <p role="alert">{error}</p>}
    {items.map(item => <article key={item.id} className="edx-paper-earlier-row">
      <div><strong>{safe(item.subject,12)} · {String(item.term||'').toLowerCase()==='finalterm' ? 'Finalterm' : 'Midterm'} · {safe(item.examDate,12)}</strong>
        <span>{item.status === 'approved' ? 'Previously approved' : item.status === 'rejected' ? 'Not published' : 'Awaiting publication'}</span>
        <p>{String(item.summary || '')}</p></div>
      <button type="button" className="edx-exam-secondary" onClick={()=>onReuse(item)}>Use this text in a new review</button>
    </article>)}
    {items.length >= 100 && <small>Showing the first 100 submissions for this account.</small>}
  </section>;
}

export default function ExamPaperCommunity({ user, subject, term, onPublished }) {
  const [community, setCommunity] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [browseSubject, setBrowseSubject] = useState('');
  const [allSubjects, setAllSubjects] = useState(true);
  const [browseTerm, setBrowseTerm] = useState('all');
  const [reviewSearch, setReviewSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [reuseDraft, setReuseDraft] = useState(null);
  useEffect(() => {
    let active = true;
    setCommunity([]); setLegacy([]); setLoading(true); setErrors([]);
    const pending = { community:true, legacy:true };
    const done = key => {
      pending[key] = false;
      if (active && !pending.community && !pending.legacy) setLoading(false);
    };
    // Quota fix 2026-09-30: one-time cached fetch (10 min) instead of two live
    // listeners reading up to 200 docs each on every visit.
    // Fetch public reviews regardless of the MCQ Bank's selected subject or
    // category. Historical reviews used different subjects/terms and were
    // previously hidden by an exact-match filter.
    const observe = async (name, setItems, key) => {
      try {
        const cacheKey = "edx-reviews-" + name;
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (cached && Date.now() - cached.ts < 600000 && Array.isArray(cached.items)) {
          if (!active) return;
          setItems(cached.items);
          setErrors(prev => prev.filter(entry=>entry.key!==key));
          done(key);
          return;
        }
        const snapshot = await getDocs(query(col(name), limit(200)));
        const items = snapshot.docs.map(d => ({ id:d.id,collectionName:name,...d.data() })).filter(r => r.isActive !== false);
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items })); } catch (_) {}
        if (!active) return;
        setItems(items);
        setErrors(prev => prev.filter(entry=>entry.key!==key));
        done(key);
      } catch (err) {
        if (!active) return;
        setErrors(prev=>[...prev.filter(entry=>entry.key!==key),
          {key,message:readError(err,key==='community'?'Student reviews':'Earlier published reviews')}]);
        done(key);
      }
    };
    observe(REVIEW_COLLECTION,setCommunity,'community');
    observe(LEGACY_COLLECTION,setLegacy,'legacy');
    return () => {active=false;};
  }, [reloadKey]);
  const reviews = useMemo(() => [...community,...legacy].filter(r =>
    (allSubjects || courseCode(r.subject)===browseSubject) &&
    (browseTerm==='all' || String(r.term||'').toLowerCase()===browseTerm) &&
    [r.subject,r.summary,r.topics,r.sharedBy,r.semester,r.examDate]
      .some(value => String(value||'').toLowerCase().includes(reviewSearch.trim().toLowerCase()))
  ).sort((a,b)=>sortBy==='oldest'
    ? dateValue(a.createdAt)-dateValue(b.createdAt)
    : dateValue(b.createdAt)-dateValue(a.createdAt)),
  [community,legacy,allSubjects,browseSubject,browseTerm,reviewSearch,sortBy]);
  const submitTerm = browseTerm === 'all' ? (term === 'finalterm' ? 'finalterm' : 'midterm') : browseTerm;
  const reuse = item => {
    setBrowseSubject(courseCode(item.subject));
    setAllSubjects(false);
    setBrowseTerm(String(item.term||'').toLowerCase()==='finalterm'?'finalterm':'midterm');
    setShowForm(true);
    setReuseDraft({ ...item, reuseId: item.id + '-' + Date.now() });
    document.getElementById('edx-paper-share-title')?.scrollIntoView?.({ behavior:'smooth', block:'start' });
  };
  const onSuccessfullyPublished = (code, examTerm) => {
    setBrowseSubject('');
    setAllSubjects(true);
    setBrowseTerm('all');
    onPublished?.(code,examTerm);
  };
  return <div className="edx-paper">
    <section className="edx-paper-hero" aria-labelledby="edx-paper-title">
      <span className="edx-paper-kicker"><MessageCircle size={16}/> Paper reviews</span>
      <h1 id="edx-paper-title">Learn from students who have taken the exam.</h1>
      <p>Read recent paper experiences, share yours and pick up useful preparation tips.</p>
      <div className="edx-paper-hero-actions"><a href="#edx-paper-feed">Browse reviews <ExternalLink size={15}/></a><a href="#edx-paper-share-title" onClick={()=>setShowForm(true)}>Write a review <Send size={15}/></a></div>
    </section>
    <div className="edx-paper-browser" role="group" aria-label="Find paper reviews">
      <label>Course code<input value={browseSubject} list="edx-paper-subjects" maxLength={12} placeholder="e.g. CS620" onChange={e=>{setBrowseSubject(courseCode(e.target.value));setAllSubjects(false);}}/><datalist id="edx-paper-subjects">{[...new Set([...SUBJECTS,subject,...community.map(r=>courseCode(r.subject)),...legacy.map(r=>courseCode(r.subject))])].filter(Boolean).map(code=><option key={code} value={code}/>)}</datalist></label>
      <label>Exam type<select value={browseTerm} onChange={e=>setBrowseTerm(e.target.value)}><option value="all">All exam types</option><option value="midterm">Midterm</option><option value="finalterm">Finalterm</option></select></label>
      <label className="edx-paper-all-subjects"><input type="checkbox" checked={allSubjects} onChange={e=>setAllSubjects(e.target.checked)}/> Show reviews for all subjects</label>
    </div>
    {showForm && <ReviewSubmission user={user} subject={browseSubject} term={submitTerm} reuseDraft={reuseDraft} onPublished={onSuccessfullyPublished} />}
    <EarlierSubmissions user={user} onReuse={reuse}/>
    <section className="edx-paper-feed" id="edx-paper-feed" aria-labelledby="edx-paper-feed-title">
      <div className="edx-paper-feed-head"><div><span className="edx-paper-kicker"><MessageCircle size={16} /> Shared by students</span><h2 id="edx-paper-feed-title">{allSubjects ? 'Latest paper experiences' : 'Paper experiences for '+browseSubject}</h2><p>Browse shared completed-exam experiences or search for a specific subject.</p></div><span className="edx-paper-feed-count">{reviews.length} {reviews.length===1?'review':'reviews'}</span></div>
      {!showForm && <button type="button" className="edx-exam-secondary" onClick={()=>setShowForm(true)}>Write a review</button>}
      <div className="edx-paper-feed-controls">
        <label><Search size={17}/><input type="search" value={reviewSearch} onChange={e=>setReviewSearch(e.target.value)} placeholder="Find a subject, topic or keyword…" aria-label="Search paper reviews"/></label>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} aria-label="Sort paper reviews"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </div>
      <div className="edx-paper-group"><MessageCircle size={19}/><p>Follow EduNexus for more paper discussions and updates.</p><a href={EDUNEXUS_WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer">Join our WhatsApp group <ExternalLink size={15}/></a></div>
      {loading && <div className="edx-paper-skeleton" role="status">Loading student reviews…</div>}
      {errors.map(error => <div key={error.key} className="edx-paper-alert" role="alert">{error.message} <button type="button" onClick={()=>setReloadKey(n=>n+1)}>Retry</button></div>)}
      {!loading && !reviews.length && !errors.length && <div className="edx-paper-empty"><MessageCircle size={28}/><h3>{allSubjects?'No published paper reviews yet':'No reviews match these filters'}</h3><p>{allSubjects?'If you shared a review earlier, check Your earlier submissions above.':'Try All subjects, All exam types, or another keyword.'}</p></div>}
      <div className="edx-paper-review-list">{reviews.map(review=><ReviewCard key={review.collectionName+':'+review.id} review={review} user={user}/>)}</div>
      <p className="edx-paper-disclaimer">Only share material you are allowed to discuss. Reviews containing spam or private exam material may be removed.</p>
    </section>
  </div>;
}
