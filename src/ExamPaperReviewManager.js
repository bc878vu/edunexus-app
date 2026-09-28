import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, MessageCircle, Plus, Search, Trash2 } from 'lucide-react';
import { storage } from './firebase-client';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { supabase, USE_SUPABASE } from './supabase-client';
import { adminPanelAccess } from './adminSession';
import { listCommunityReviews, listLegacyReviews, updateCommunityReview, deleteCommunityReview, setCommunityReviewActive, updateLegacyReview, deleteLegacyReview, subscribeCommunityReviews } from './db/examReviews';
import { listFeedback, subscribeFeedback } from './db/feedback';
import { subscribeTable } from './db/realtime';

const REVIEW_WORD_LIMIT = 10000;
const REVIEW_CHAR_LIMIT = 300000;
const countReviewWords = (value) => String(value || '').trim().match(/\S+/gu)?.length || 0;
const LEGACY_ROOT = ['artifacts', 'edunexus-live', 'public', 'data'];
const COLLECTIONS = ['examCommunityReviews', 'examReviews'];
// TODO(adapter): db/examReviews.js has no subscribeLegacyReviews or
// createLegacyReview helper yet. These local mini-adapters expose the same
// onInvalidate contract / plain-row semantics; move them into the adapter
// when they are available.
const subscribeLegacyReviews = ({ onInvalidate }) => {
  if (USE_SUPABASE) return subscribeTable({ table: 'exam_reviews', onInvalidate });
  let unsub = () => {};
  let cancelled = false;
  (async () => {
    const { collection, query, limit, onSnapshot } = await import('firebase/firestore');
    const { db } = await import('./firebase-client');
    if (cancelled) return;
    unsub = onSnapshot(query(collection(db, ...LEGACY_ROOT, 'examReviews'), limit(200)),
      () => { try { onInvalidate(); } catch (_) {} }, () => {});
  })();
  return () => { cancelled = true; unsub(); };
};
// Mirrors the LEGACY_SPEC field mapping in db/examReviews.js.
const createLegacyReview = async (values) => {
  if (USE_SUPABASE) {
    const id = (window.crypto?.randomUUID?.() || ('id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)));
    const { error } = await supabase.from('exam_reviews').insert({
      id,
      subject: values.subject,
      term: values.term,
      semester: values.semester || null,
      exam_date: values.examDate || null,
      exam_time: values.examTime || null,
      shared_by: values.sharedBy || null,
      difficulty: values.difficulty,
      topics: values.topics || null,
      summary: values.summary,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return id;
  }
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  const { db } = await import('./firebase-client');
  const ref = await addDoc(collection(db, ...LEGACY_ROOT, 'examReviews'), { ...values, createdAt: serverTimestamp() });
  return ref.id;
};
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
const timestamp = (value) => {
  if (value?.toMillis) return value.toMillis();
  const t = value ? Date.parse(String(value)) : NaN;
  return Number.isFinite(t) ? t : 0;
};
const formatReportDate = (value) => {
  try {
    const d = value?.toDate ? value.toDate() : (value ? new Date(value) : null);
    return d && Number.isFinite(d.getTime()) ? d.toLocaleString() : 'Date pending';
  } catch (_) { return 'Date pending'; }
};

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
  return { values, examAt: moment };
}

export default function ExamPaperReviewManager({ user }) {
  // Re-evaluate the admin gate on navigation/session events. The gate reads
  // live window.location (?page=admin) plus the per-tab session marker, so a
  // value computed once per render can go stale while the buttons stay on
  // screen — every Save/Delete click then silently returns with no feedback.
  const [allowed, setAllowed] = useState(() => adminPanelAccess(user));
  useEffect(() => {
    const sync = () => setAllowed(adminPanelAccess(user));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('edunexus:navigation', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('edunexus:navigation', sync);
      window.removeEventListener('storage', sync);
    };
  }, [user]);
  const [subject, setSubject] = useState('CS620');
  const [community, setCommunity] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  // In-page confirmation (replaces native window.confirm so the action also
  // works in automated browsers, which auto-dismiss native dialogs).
  // { kind: 'save'|'delete', message, record? }
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportError, setReportError] = useState('');
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const load = async () => {
      try {
        const items = await listFeedback({ category: 'exam-review-report', limit: 200 });
        if (!active) return;
        setReports(items);
        setReportError('');
      } catch (_) {
        if (active) setReportError('Could not load review reports. Check admin permissions.');
      }
    };
    load();
    const unsubscribe = subscribeFeedback({ onInvalidate: load });
    return () => { active = false; unsubscribe(); };
  }, [allowed]);
  useEffect(() => {
    if (!allowed || !validCode(subject)) { setCommunity([]); setLegacy([]); return; }
    setError('');
    let active = true;
    const loadCommunity = async () => {
      try {
        const items = await listCommunityReviews({ subject, limit: 200 });
        if (active) setCommunity(items.map(item => ({ ...item, collectionName: COLLECTIONS[0] })));
      } catch (_) { if (active) setError('Reviews could not load. Please retry in a moment.'); }
    };
    const loadLegacy = async () => {
      try {
        const items = await listLegacyReviews({ subject, limit: 200 });
        if (active) setLegacy(items.map(item => ({ ...item, collectionName: COLLECTIONS[1] })));
      } catch (_) { if (active) setError('Reviews could not load. Please retry in a moment.'); }
    };
    loadCommunity();
    loadLegacy();
    const stopCommunity = subscribeCommunityReviews({ subject, onInvalidate: loadCommunity });
    const stopLegacy = subscribeLegacyReviews({ onInvalidate: loadLegacy });
    return () => { active = false; stopCommunity(); stopLegacy(); };
  }, [allowed, subject]);
  const records = useMemo(() => [...community,...legacy]
    .filter(r => [r.summary,r.topics,r.sharedBy,r.examDate].some(v => String(v || '').toLowerCase().includes(search.trim().toLowerCase())))
    .sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt)),[community,legacy,search]);
  if (!allowed) return null;
  const change = (key, value) => setDraft(prev=>({...prev,[key]:value}));
  const open = record => { setSelected(record); setDraft(editable(record)); setNotice(''); setError(''); };
  const requestSave = event => {
    event.preventDefault();
    if (busy || pendingConfirm) return;
    // Never fail silently: a stale admin gate must explain itself instead of
    // making the Save button look dead.
    if (!adminPanelAccess(user)) { setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.'); return; }
    setNotice(''); setError('');
    try {
      validateReviewDraft(draft, selected);
    } catch(e) { setError(e?.message || 'Could not save this review.'); return; }
    setPendingConfirm({ kind: 'save',
      message: selected ? 'Save changes to this published paper review?' : 'Publish this completed-paper review?' });
  };
  const confirmSave = async () => {
    if (busy) return;
    setPendingConfirm(null);
    if (!adminPanelAccess(user)) { setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.'); return; }
    setNotice(''); setError('');
    try {
      const { values, examAt } = validateReviewDraft(draft, selected);
      setBusy(true);
      if (selected) {
        // Legacy records contain fewer fields, so do not add irrelevant fields.
        const changes = selected.collectionName === COLLECTIONS[0] ? { ...values, examAt } :
          { subject:values.subject, term:values.term, examDate:values.examDate, examTime:values.examTime,
            sharedBy:values.sharedBy, semester:values.semester, difficulty:values.difficulty,
            topics:values.topics, summary:values.summary };
        if (selected.collectionName === COLLECTIONS[0]) await updateCommunityReview(selected.id, changes);
        else await updateLegacyReview(selected.id, changes);
      } else {
        await createLegacyReview(values);
      }
      setNotice(selected ? 'Review updated.' : 'Review published.');
      setSelected(null); setDraft(initial());
    } catch(e) { setError(e?.message || 'Could not save this review.'); }
    finally { setBusy(false); }
  };
  const requestRemove = record => {
    if (busy || pendingConfirm) return;
    if (!adminPanelAccess(user)) { setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.'); return; }
    setPendingConfirm({ kind: 'delete', record, message: 'Delete this published review? This cannot be undone.' });
  };
  const toggleReviewActive = async (record) => {
    if (busy || pendingConfirm) return;
    if (!adminPanelAccess(user)) { setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.'); return; }
    const next = record.isActive === false ? true : false;
    setBusy(true); setError(''); setNotice('');
    try {
      // TODO(adapter): on the Supabase branch legacy visibility writes have no
      // is_active column mapping yet (see updateLegacyReview); legacy records
      // stay visible until that column is added. Community visibility works on
      // both branches via setCommunityReviewActive.
      if (record.collectionName === COLLECTIONS[0]) await setCommunityReviewActive(record.id, next);
      else await updateLegacyReview(record.id, { isActive: next });
      setNotice(next ? 'Review is now visible to students.' : 'Review hidden from students. It can be shown again anytime.');
    } catch (_) { setError('Could not update review visibility. Please check your access.'); }
    finally { setBusy(false); }
  };
  const confirmRemove = async () => {
    const record = pendingConfirm && pendingConfirm.kind === 'delete' ? pendingConfirm.record : null;
    setPendingConfirm(null);
    if (!record || busy) return;
    if (!adminPanelAccess(user)) { setError('Your admin session for this tab has expired. Reload the admin page (?page=admin) and sign in again.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (record.collectionName === COLLECTIONS[0]) await deleteCommunityReview(record.id);
      else await deleteLegacyReview(record.id);
      let attachmentNotice = '';
      if (record.paperPath && record.paperPath.startsWith('exam-papers/' + record.userId + '/')) {
        try {
          if (USE_SUPABASE) {
            const { error: storageError } = await supabase.storage.from('exam-papers').remove([record.paperPath]);
            if (storageError) throw storageError;
          } else {
            await deleteObject(storageRef(storage, record.paperPath));
          }
        }
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
    <section className="edx-review-manager-reports" aria-label="Student review reports"><h4>Student review reports ({reports.length})</h4>{reportError && <p role="alert">{reportError}</p>}{!reports.length && !reportError && <p>No reports received.</p>}{reports.sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt)).map(report=><article key={report.id}><strong>{trim(report.reviewId,140)}</strong><p>{trim(report.reason,500)}</p><small>{report.reviewCollection === 'examReviews' ? 'Earlier review' : 'Student review'} · {formatReportDate(report.createdAt)}</small><div><button type="button" className="edx-exam-secondary" onClick={()=>{setSubject(courseCode(String(report.reviewId||'').split('_').slice(-3)[0]));setSearch('');}}>Find reported review</button></div></article>)}</section>
    <div className="edx-review-manager-controls">
      <label className="edx-exam-field">Course code<input value={subject} maxLength={12} onChange={e=>setSubject(courseCode(e.target.value))} placeholder="e.g. CS620"/></label>
      <label className="edx-exam-field">Find a review <span className="edx-study-search"><Search size={17}/><input type="search" value={search} placeholder="Search name, date or content" onChange={e=>setSearch(e.target.value)}/></span></label>
    </div>
    <p>{records.length} reviews shown for {subject}. Search another subject to manage its reviews.</p>
    {notice && <p role="status" className="edx-exam-success">{notice}</p>}
    {error && <p role="alert" className="edx-exam-alert">{error}</p>}
    <div className="edx-review-manager-list">{records.map(r=><article key={r.collectionName + ':' + r.id}>
      <div><strong>{r.subject} · {r.term === 'midterm' ? 'Midterm' : 'Finalterm'} · {r.sharedBy || 'Student'}</strong>{r.isActive === false && <span style={{marginLeft:8,fontSize:11,background:'#fef2f2',color:'#dc2626',padding:'2px 8px',borderRadius:10,fontWeight:700}}>Hidden</span>}<small>{r.examDate || 'No date'} · {r.collectionName === COLLECTIONS[0] ? 'Student review' : 'Earlier review'}</small><p>{trim(r.summary,240)}</p></div>
      <div className="edx-review-manager-actions"><button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>open(r)}><Edit3 size={15}/> Edit</button>
      <button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>toggleReviewActive(r)}>{r.isActive === false ? 'Show' : 'Hide'}</button>
      <button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>requestRemove(r)}><Trash2 size={15}/> Delete</button></div>
    </article>)}</div>
    <form className="edx-review-manager-form" onSubmit={requestSave}>
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
    {pendingConfirm && <div className="edx-exam-confirm" role="alertdialog" aria-modal="true" aria-label="Confirm action">
      <p>{pendingConfirm.message}</p>
      <div className="edx-review-manager-actions">
        <button type="button" className="edx-exam-primary" disabled={busy} onClick={()=>{ pendingConfirm.kind === 'delete' ? confirmRemove() : confirmSave(); }}>Confirm</button>
        <button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>setPendingConfirm(null)}>Cancel</button>
      </div>
    </div>}
  </section>;
}
