import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Edit3, MessageCircle, Plus, Search, Trash2 } from 'lucide-react';
import { db, storage } from './firebase-client';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { adminPanelAccess } from './adminSession';

const REVIEW_WORD_LIMIT = 10000;
const REVIEW_CHAR_LIMIT = 300000;
const countReviewWords = (value) => String(value || '').trim().match(/\S+/gu)?.length || 0;
const ROOT = ['artifacts', 'edunexus-live', 'public', 'data'];
const COLLECTIONS = ['examCommunityReviews', 'examReviews'];
const col = (name) => collection(db, ...ROOT, name);
const trim = (value, max) => String(value || '').trim().slice(0, max);
const courseCode = (value) => trim(value, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const validCode = (code) => /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(code);
const initial = () => ({ subject:'', term:'midterm', semester:'Spring ' + new Date().getFullYear(),
  examDate:'', examTime:'', sharedBy:'', difficulty:'moderate', topics:'', summary:'' });
const editable = (record) => ({
  subject: record.subject || 'CS620',
  term: record.term || 'midterm',
  semester: record.semester || '',
  examDate: record.examDate || '',
  examTime: record.examTime || '',
  sharedBy: record.sharedBy || '',
  difficulty: record.difficulty || 'moderate',
  topics: record.topics || '',
  summary: record.summary || ''
});
const timestamp = (value) => value?.toMillis?.() || 0;

// Editing changes public student content, so the source/owner and original
// publication timestamp remain immutable. The admin must confirm every save.
export function validateReviewDraft(draft, original = null) {
  const values = {
    subject:courseCode(draft.subject), term:draft.term, semester:trim(draft.semester,20),
    examDate:trim(draft.examDate,10), examTime:trim(draft.examTime,5),
    sharedBy:trim(draft.sharedBy,60), difficulty:draft.difficulty,
    topics:trim(draft.topics,400), summary:String(draft.summary || '').trim()
  };
  if (values.summary.length > REVIEW_CHAR_LIMIT || countReviewWords(values.summary) > REVIEW_WORD_LIMIT)
    throw new Error('Review must contain no more than 10,000 words and 300,000 characters.');
  if (!validCode(values.subject) || !['midterm','finalterm'].includes(values.term) ||
    !['easy','moderate','challenging'].includes(values.difficulty) ||
    values.summary.length < 20 || !/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(values.examDate) ||
    (values.semester && !/^(Spring|Fall|Summer) 20[0-9]{2}$/.test(values.semester)) ||
    (values.sharedBy.length > 0 && values.sharedBy.length < 2)) {
    throw new Error('Enter a valid subject, exam type, completed exam date and at least 20 characters of review text.');
  }
  if (values.examTime && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(values.examTime))
    throw new Error('Enter a valid exam time or leave it blank.');
  if (original?.collectionName === COLLECTIONS[0] && (values.sharedBy.length < 2 || !values.examTime ||
      !/^(Spring|Fall|Summer) 20[0-9]{2}$/.test(values.semester)))
    throw new Error('Student reviews require a display name, semester and exam time.');
  const moment = new Date(values.examDate + 'T' + (values.examTime || '00:00') + ':00');
  if (!Number.isFinite(moment.getTime()) || moment.getTime() > Date.now())
    throw new Error('The exam date and time must be in the past.');
  return { values, examAt: Timestamp.fromDate(moment) };
}

export default function ExamPaperReviewManager({ user }) {
  const allowed = adminPanelAccess(user);
  const [subject, setSubject] = useState('CS620');
  const [community, setCommunity] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportError, setReportError] = useState('');
  useEffect(() => {
    if (!allowed) return;
    return onSnapshot(query(col('feedback'), where('category','==','exam-review-report')),
      snapshot => { setReports(snapshot.docs.map(d=>({id:d.id,...d.data()}))); setReportError(''); },
      () => setReportError('Could not load review reports. Check admin permissions.'));
  }, [allowed]);
  useEffect(() => {
    if (!allowed || !validCode(subject)) { setCommunity([]); setLegacy([]); return; }
    setError('');
    const stop = COLLECTIONS.map((name, index) => onSnapshot(
      query(col(name), where('subject','==',subject), limit(200)),
      snap => (index === 0 ? setCommunity : setLegacy)(
        snap.docs.map(docSnap => ({ id:docSnap.id, collectionName:name, ...docSnap.data() }))),
      () => setError('Reviews could not load. Please retry in a moment.')
    ));
    return () => stop.forEach(unsubscribe => unsubscribe());
  }, [allowed, subject]);
  const records = useMemo(() => [...community,...legacy]
    .filter(r => [r.summary,r.topics,r.sharedBy,r.examDate].some(v => String(v || '').toLowerCase().includes(search.trim().toLowerCase())))
    .sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt)),[community,legacy,search]);
  if (!allowed) return null;
  const change = (key, value) => setDraft(prev=>({...prev,[key]:value}));
  const open = record => { setSelected(record); setDraft(editable(record)); setNotice(''); setError(''); };
  const save = async event => {
    event.preventDefault();
    if (busy || !adminPanelAccess(user)) return;
    setNotice(''); setError('');
    try {
      const { values, examAt } = validateReviewDraft(draft, selected);
      if (!window.confirm(selected ? 'Save changes to this published paper review?' : 'Publish this completed-paper review?')) return;
      setBusy(true);
      if (selected) {
        // Legacy records contain fewer fields, so do not add irrelevant fields.
        const changes = selected.collectionName === COLLECTIONS[0] ? { ...values, examAt } :
          { subject:values.subject, term:values.term, examDate:values.examDate, examTime:values.examTime,
            sharedBy:values.sharedBy, semester:values.semester, difficulty:values.difficulty,
            topics:values.topics, summary:values.summary };
        await updateDoc(doc(col(selected.collectionName),selected.id), changes);
      } else {
        await addDoc(col('examReviews'), { ...values, createdAt:serverTimestamp() });
      }
      setNotice(selected ? 'Review updated.' : 'Review published.');
      setSelected(null); setDraft(initial());
    } catch(e) { setError(e?.message || 'Could not save this review.'); }
    finally { setBusy(false); }
  };
  const remove = async record => {
    if (busy || !adminPanelAccess(user) || !window.confirm('Delete this published review? This cannot be undone.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteDoc(doc(col(record.collectionName),record.id));
      let attachmentNotice = '';
      if (record.paperPath && record.paperPath.startsWith('exam-papers/' + record.userId + '/')) {
        try { await deleteObject(storageRef(storage, record.paperPath)); }
        catch (_) { attachmentNotice = ' The review was removed; its attached file may still need to be deleted from storage.'; }
      }
      if (selected?.id === record.id && selected?.collectionName === record.collectionName) {
        setSelected(null); setDraft(initial());
      }
      setNotice('Review deleted.' + attachmentNotice);
    } catch (_) { setError('Could not delete this review. Please check your access.'); }
    finally { setBusy(false); }
  };
  return <section className="edx-exam-card edx-review-manager" aria-label="Manage paper reviews">
    <div className="edx-exam-between"><div><h3>Manage paper reviews</h3><p>Publish, edit or remove completed-paper reviews without changing student accounts.</p></div><MessageCircle size={24}/></div>
    <section className="edx-review-manager-reports" aria-label="Student review reports"><h4>Student review reports ({reports.length})</h4>{reportError && <p role="alert">{reportError}</p>}{!reports.length && !reportError && <p>No reports received.</p>}{reports.sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt)).map(report=><article key={report.id}><strong>{trim(report.reviewId,140)}</strong><p>{trim(report.reason,500)}</p><small>{report.reviewCollection === 'examReviews' ? 'Earlier review' : 'Student review'} · {report.createdAt?.toDate?.()?.toLocaleString?.() || 'Date pending'}</small><div><button type="button" className="edx-exam-secondary" onClick={()=>{setSubject(courseCode(String(report.reviewId||'').split('_').slice(-3)[0]));setSearch('');}}>Find reported review</button></div></article>)}</section>
    <div className="edx-review-manager-controls">
      <label className="edx-exam-field">Course code<input value={subject} maxLength={12} onChange={e=>setSubject(courseCode(e.target.value))} placeholder="e.g. CS620"/></label>
      <label className="edx-exam-field">Find a review <span className="edx-study-search"><Search size={17}/><input type="search" value={search} placeholder="Search name, date or content" onChange={e=>setSearch(e.target.value)}/></span></label>
    </div>
    <p>{records.length} reviews shown for {subject}. Search another subject to manage its reviews.</p>
    {notice && <p role="status" className="edx-exam-success">{notice}</p>}
    {error && <p role="alert" className="edx-exam-alert">{error}</p>}
    <div className="edx-review-manager-list">{records.map(r=><article key={r.collectionName + ':' + r.id}>
      <div><strong>{r.subject} · {r.term === 'midterm' ? 'Midterm' : 'Finalterm'} · {r.sharedBy || 'Student'}</strong><small>{r.examDate || 'No date'} · {r.collectionName === COLLECTIONS[0] ? 'Student review' : 'Earlier review'}</small><p>{trim(r.summary,240)}</p></div>
      <div className="edx-review-manager-actions"><button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>open(r)}><Edit3 size={15}/> Edit</button>
      <button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>remove(r)}><Trash2 size={15}/> Delete</button></div>
    </article>)}</div>
    <form className="edx-review-manager-form" onSubmit={save}>
      <div className="edx-exam-between"><h4>{selected ? 'Edit published review' : 'Add a paper review'}</h4><button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>{setSelected(null);setDraft(initial());}}><Plus size={15}/> New review</button></div>
      <div className="edx-review-manager-fields">
        <label className="edx-exam-field">Course<input required value={draft.subject} maxLength={12} onChange={e=>change('subject',courseCode(e.target.value))}/></label>
        <label className="edx-exam-field">Exam type<select value={draft.term} onChange={e=>change('term',e.target.value)}><option value="midterm">Midterm</option><option value="finalterm">Finalterm</option></select></label>
        <label className="edx-exam-field">Semester<input value={draft.semester} maxLength={20} onChange={e=>change('semester',e.target.value)} placeholder="Spring 2026"/></label>
        <label className="edx-exam-field">Exam date<input required type="date" value={draft.examDate} max={new Date().toISOString().slice(0,10)} onChange={e=>change('examDate',e.target.value)}/></label>
        <label className="edx-exam-field">Exam time<input type="time" value={draft.examTime} onChange={e=>change('examTime',e.target.value)}/></label>
        <label className="edx-exam-field">Display name<input value={draft.sharedBy} maxLength={60} onChange={e=>change('sharedBy',e.target.value)}/></label>
        <label className="edx-exam-field">Difficulty<select value={draft.difficulty} onChange={e=>change('difficulty',e.target.value)}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select></label>
        <label className="edx-exam-field">Topics<input value={draft.topics} maxLength={400} onChange={e=>change('topics',e.target.value)}/></label>
        <label className="edx-exam-field edx-review-manager-wide">Review<textarea required minLength={20} maxLength={REVIEW_CHAR_LIMIT} rows={10} value={draft.summary} onChange={e=>change('summary',e.target.value)}/></label>
      </div>
      <button className="edx-exam-primary" disabled={busy}>{busy ? 'Saving…' : selected ? 'Save changes' : 'Publish review'}</button>
    </form>
  </section>;
}
