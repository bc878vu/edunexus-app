import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { CalendarDays, CheckCircle2, ClipboardCopy, Clock3, ExternalLink, FileText, GraduationCap, MessageCircle, Send, Share2, ShieldAlert, Sparkles, Trash2, Users } from 'lucide-react';
import { db } from './firebase-client';
import { examReviewText, formatExamDate, formatExamTime, whatsAppReviewUrl, EDUNEXUS_WHATSAPP_GROUP } from './examReviewFormat';
import './exam-paper-community.css';

const ROOT = ['artifacts', 'edunexus-live', 'public', 'data'];
const col = (name) => collection(db, ...ROOT, name);
const REVIEW_COLLECTION = 'examCommunityReviews';
const LEGACY_COLLECTION = 'examReviews';
const safe = (value, max = 1500) => String(value == null ? '' : value).trim().slice(0, max);
const courseCode = (value) => safe(value, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const validCourse = (value) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(value);
const isAdmin = (user) => adminPanelAccess(user);
const dateValue = (value) => value && typeof value.toMillis === 'function' ? value.toMillis() : 0;
const todayLocal = () => {
  const d = new Date(), pad = (v) => String(v).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const SUBJECTS = ['CS101', 'CS201', 'CS301', 'CS302', 'CS304', 'CS401', 'CS403', 'CS510', 'CS511', 'CS601', 'CS604', 'CS610', 'ENG101', 'ENG201', 'MGT101', 'MGT201', 'MTH101', 'MTH202', 'MTH601', 'PHY101', 'STA301'];
const defaultForm = (subject, term) => ({
  subject, term, examDate: '', examTime: '', semesterSeason: 'Spring',
  semesterYear: new Date().getFullYear(), sharedBy: '', difficulty: 'moderate',
  topics: '', summary: ''
});
const readError = (error, name) => error?.code === 'permission-denied'
  ? name + ' cannot load. Publish the updated Firestore rules for the new public review collection.'
  : name + ' could not load. Check your connection and retry.';

function ReviewSubmission({ user, subject, term, onPublished }) {
  const [form, setForm] = useState(() => defaultForm(subject, term));
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const listId = React.useId();
  const saving = useRef(false);
  useEffect(() => {
    setForm((prev) => ({ ...prev, subject, term }));
  }, [subject, term]);
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const publish = async (event) => {
    event.preventDefault();
    if (saving.current) return;
    setError(''); setNotice('');
    if (!user?.uid) { setError('Please sign in to share a review.'); return; }
    const code = courseCode(form.subject);
    const name = safe(form.sharedBy, 60);
    const summary = safe(form.summary, 1500);
    const examMoment = new Date(form.examDate + 'T' + form.examTime + ':00');
    const futureExam = !Number.isFinite(examMoment.getTime()) || examMoment.getTime() > Date.now();
    if (!validCourse(code) || !form.examDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.examTime)
      || futureExam || name.length < 2 || summary.length < 20 || summary.length > 1500
      || !['Spring', 'Fall', 'Summer'].includes(form.semesterSeason)
      || !Number.isInteger(Number(form.semesterYear)) || Number(form.semesterYear) < 2020
      || Number(form.semesterYear) > new Date().getFullYear() + 1 || !agreed) {
      setError('Complete the course, semester, your name, a completed exam date and time, at least 20 characters of feedback, and the academic-integrity confirmation.');
      return;
    }
    saving.current = true; setBusy(true);
    try {
      const id = [user.uid, code, form.term, form.examDate].join('_');
      await setDoc(doc(col(REVIEW_COLLECTION), id), {
        userId: user.uid, subject: code, term: form.term,
        semester: form.semesterSeason + ' ' + form.semesterYear,
        examDate: form.examDate, examTime: form.examTime,
        examAt: Timestamp.fromDate(examMoment),
        sharedBy: name, difficulty: form.difficulty,
        topics: safe(form.topics, 400), summary, createdAt: serverTimestamp()
      });
      setNotice('Your review is live! Students can copy or share it below without waiting for admin approval.');
      if (onPublished) onPublished(code, form.term);
      setForm((prev) => ({ ...defaultForm(prev.subject, prev.term), semesterYear: prev.semesterYear }));
      setAgreed(false);
    } catch (err) {
      setError(err?.code === 'permission-denied'
        ? 'Instant publishing is not enabled in live Firebase yet. Please publish the updated Firestore rules, then retry.'
        : 'Could not publish. A review for this subject, exam type and date may already exist for your account, or your connection failed.');
    } finally { saving.current = false; setBusy(false); }
  };
  return <section className="edx-paper-submit" aria-labelledby="edx-paper-share-title">
    <div className="edx-paper-submit-head"><span className="edx-paper-kicker"><Sparkles size={15} /> Share with the EduNexus community</span><h2 id="edx-paper-share-title">Share your completed-exam experience</h2>
      <p>Write a helpful review and publish it directly. Students can read, copy and share your experience on WhatsApp as soon as it appears. Only share content from a completed exam that you are permitted to discuss.</p>
      <div className="edx-paper-info"><CheckCircle2 size={15} /> Instant publishing · No admin approval required · Public student contribution</div>
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
        <label className="edx-paper-full">Paper content and preparation advice <textarea required minLength={20} maxLength={1500} rows={5} placeholder="Describe your completed exam experience, general topics and study advice…" value={form.summary} onChange={(e) => update('summary', e.target.value)} /><span className="edx-paper-count">{form.summary.length} / 1500</span></label>
      </div>
      <label className="edx-paper-consent"><input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>I have completed this exam, and my review does not disclose confidential or active examination material. I understand that my display name and review will be publicly visible.</span></label>
      {error && <div className="edx-paper-alert" role="alert">{error}</div>}
      {notice && <div className="edx-paper-success" role="status"><CheckCircle2 size={18} /> {notice} <a href="#edx-paper-feed">View reviews</a></div>}
      <button className="edx-paper-publish" type="submit" disabled={busy || !user || !agreed}><Send size={18} /> {busy ? 'Publishing your review…' : 'Publish paper review now'}</button>
      {!user && <p className="edx-paper-hint">Waiting for a student session. Reload the page if the button remains disabled.</p>}
    </form>
  </section>;
}

function ReviewCard({ review, user, onRemoved }) {
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const text = useMemo(() => examReviewText(review), [review]);
  const shareLink = useMemo(() => whatsAppReviewUrl(review), [review]);
  const remove = async () => {
    if (!isAdmin(user) || !window.confirm('Remove this review from EduNexus?')) return;
    setWorking(true); setNotice('');
    try { await deleteDoc(doc(col(review.collectionName), review.id)); if (onRemoved) onRemoved(review); }
    catch (_) { setNotice('Could not remove this review. Check admin permissions.'); }
    finally { setWorking(false); }
  };
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
      setNotice('Report sent to the EduNexus administrator.');
    } catch (_) { setNotice('Report could not be sent. Please try again.'); }
    finally { setWorking(false); }
  };
  const legacy = review.collectionName === LEGACY_COLLECTION;
  return <article className="edx-paper-card">
    <div className="edx-paper-card-head"><div className="edx-paper-course"><GraduationCap size={18} /><strong>{safe(review.subject, 12)}</strong><span>{review.term === 'midterm' ? 'Midterm' : 'Finalterm'}{review.semester ? ' · ' + safe(review.semester, 20) : ''}</span></div><span className="edx-paper-chip">{legacy ? 'Previously approved' : 'Student shared'}</span></div>
    <div className="edx-paper-card-meta"><span><CalendarDays size={15} /> {formatExamDate(review.examDate)}</span>{review.examTime && <span><Clock3 size={15} /> {formatExamTime(review.examTime)}</span>}<span><Users size={15} /> {safe(review.sharedBy, 60) || 'Student'}</span><span className="edx-paper-difficulty">{safe(review.difficulty, 20) || 'Unrated'}</span></div>
    <div className="edx-paper-content"><strong><FileText size={17} /> Paper content & preparation advice</strong>{review.topics && <p className="edx-paper-topics">Topics: {safe(review.topics, 400)}</p>}<p>{safe(review.summary, 1500)}</p></div>
    <div className="edx-paper-card-bottom"><span>EduNexus community contribution · Not verified by Virtual University</span><div className="edx-paper-card-actions"><button type="button" onClick={copy} className="edx-paper-copy"><ClipboardCopy size={16} /> Copy</button><a href={shareLink} target="_blank" rel="noopener noreferrer" className="edx-paper-whatsapp"><Share2 size={16} /> Share on WhatsApp</a></div></div>
    <div className="edx-paper-card-secondary"><button type="button" onClick={report} disabled={working}><ShieldAlert size={14} /> Report</button>{isAdmin(user) && <button type="button" onClick={remove} disabled={working}><Trash2 size={14} /> Remove review</button>}</div>
    {notice && <p className="edx-paper-notice" role="status">{notice}</p>}
  </article>;
}

export default function ExamPaperCommunity({ user, subject, term, onPublished }) {
  const [community, setCommunity] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!validCourse(subject)) { setCommunity([]); setLegacy([]); setLoading(false); return; }
    let active = true;
    setCommunity([]); setLegacy([]); setLoading(true); setErrors([]);
    const pending = { community: true, legacy: true };
    const done = (key) => { pending[key] = false; if (active && !pending.community && !pending.legacy) setLoading(false); };
    const observe = (name, setItems, key) => onSnapshot(query(col(name), where('subject', '==', subject), limit(100)),
      (snapshot) => {
        if (!active) return;
        setItems(snapshot.docs.map((d) => ({ id: d.id, collectionName: name, ...d.data() })).filter((r) => r.term === term));
        setErrors((prev) => prev.filter((entry) => entry.key !== key));
        done(key);
      },
      (error) => {
        if (!active) return;
        setErrors((prev) => [...prev.filter((entry) => entry.key !== key), { key, message: readError(error, key === 'community' ? 'Instant reviews' : 'Previously approved reviews') }]);
        done(key);
      }
    );
    const unsubscribeCommunity = observe(REVIEW_COLLECTION, setCommunity, 'community');
    const unsubscribeLegacy = observe(LEGACY_COLLECTION, setLegacy, 'legacy');
    return () => { active = false; unsubscribeCommunity(); unsubscribeLegacy(); };
  }, [subject, term, reloadKey]);
  const reviews = useMemo(() => [...community, ...legacy].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)), [community, legacy]);
  return <div className="edx-paper">
    <ReviewSubmission user={user} subject={subject} term={term} onPublished={onPublished} />
    <section className="edx-paper-feed" id="edx-paper-feed" aria-labelledby="edx-paper-feed-title">
      <div className="edx-paper-feed-head"><div><span className="edx-paper-kicker"><MessageCircle size={16} /> EduNexus student community</span><h2 id="edx-paper-feed-title">Latest completed-paper reviews</h2><p>Student experiences and general preparation advice appear here as they are published. Use Copy or WhatsApp Share to send a review in the EduNexus format.</p></div><span className="edx-paper-feed-count">{reviews.length} loaded reviews</span></div>
      <div className="edx-paper-group"><MessageCircle size={19} /><p>Follow EduNexus for more paper discussions and updates.</p><a href={EDUNEXUS_WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer">Join our WhatsApp group <ExternalLink size={15} /></a></div>
      {loading && <div className="edx-paper-skeleton" role="status">Loading student reviews…</div>}
      {errors.map((error) => <div key={error.key} className="edx-paper-alert" role="alert">{error.message} <button type="button" onClick={() => setReloadKey((n) => n + 1)}>Retry</button></div>)}
      {!loading && !reviews.length && !errors.length && <div className="edx-paper-empty"><MessageCircle size={28} /><h3>No reviews for this subject yet</h3><p>Submit your completed-exam experience above to help other students.</p></div>}
      <div className="edx-paper-review-list">{reviews.map((review) => <ReviewCard key={review.collectionName + ':' + review.id} review={review} user={user} />)}</div>
      <p className="edx-paper-disclaimer">Student-contributed information is not an official exam paper. Public reviews may be removed by the administrator if they contain spam, confidential questions or inappropriate content. Sharing and copying are optional.</p>
    </section>
  </div>;
}
