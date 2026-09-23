import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { CheckCircle2, Pencil, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { db } from './firebase-client';
import { adminPanelAccess } from './adminSession';
import { categoryOf, orderOf, quizSetOf, stripQuizMarker, validateMcq } from './examMcqImport';
import { explanationForStudent } from './examAnswerFeedback';
import { isVerifiedAnswer } from './examPractice';

const PATH = ['artifacts','edunexus-live','public','data','examMcqs'];
const COURSE = /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/;
const clean = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
const SOURCE_TAG = '[EduNexus admin verified] Admin review source: ';
const fromRecord = q => ({
  subject:q.subject, term:categoryOf(q), quizSet:quizSetOf(q), question:q.question,
  options:[...q.options], answer:q.answer, explanation:explanationForStudent(q),
  verificationSource:''
});
const errorText = e => e?.code === 'permission-denied' ? 'Firebase denied this change. Reopen the verified Admin Panel and check your Firestore rules.' : e?.message || 'Action could not be completed. Try again.';

export default function ExamMcqAdminManager({ user, initialSubject='CS620' }) {
  const [subject, setSubject] = useState(COURSE.test(initialSubject) ? initialSubject : 'CS620');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulkTarget, setBulkTarget] = useState('');
  const [bulkCountConfirmation, setBulkCountConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!adminPanelAccess(user) || !COURSE.test(subject)) { setRecords([]); setLoading(false); return; }
    setLoading(true); setError('');
    return onSnapshot(query(collection(db,...PATH),where('subject','==',subject),limit(1000)), shot => {
      setRecords(shot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>
        ((a.createdAt?.toMillis?.() || 0)-(b.createdAt?.toMillis?.() || 0)) || a.id.localeCompare(b.id)));
      setLoading(false);
    }, e => {setLoading(false);setError(errorText(e));});
  }, [subject,user]);

  const filtered = useMemo(() => records.filter(q =>
    (category === 'all' || categoryOf(q) === category) &&
    [q.question, ...(q.options || []),quizSetOf(q)].join(' ').toLowerCase().includes(search.toLowerCase().trim())
  ),[records,category,search]);
  if (!adminPanelAccess(user)) return null;
  const openEdit = q => { setSelected(q); setDraft(fromRecord(q)); setMessage(''); setError(''); };
  const save = async e => {
    e.preventDefault();
    if (!selected || !draft || busy || !adminPanelAccess(user)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const previous = fromRecord(selected);
      const keysChanged = previous.answer !== Number(draft.answer) ||
        previous.question !== draft.question.trim() ||
        previous.options.some((v,i)=>v !== draft.options[i].trim());
      const supplied = String(draft.verificationSource || '').trim();
      const originalSource = isVerifiedAnswer(selected) ? String(selected.explanation).split(SOURCE_TAG).pop().trim() : '';
      const activeSource = supplied.length >= 12 ? supplied : (!keysChanged ? originalSource : '');
      if (keysChanged && supplied.length < 12)
        throw new Error('For an edited answer, question or option, provide the handout or trusted answer-key reference (at least 12 characters).');
      let normalized = validateMcq({
        ...draft,
        subject:clean(draft.subject),
        answer:Number(draft.answer),
        // Preserve original imported quiz sequence even if category changes.
        explanation:draft.term === 'quiz'
          ? '[EduNexus Quiz|order:' + String(orderOf(selected) || 1).padStart(4,'0') + '] ' + draft.explanation
          : '[EduNexus ' + (draft.term === 'midterm' ? 'Midterm' : 'Finalterm') + '] ' + draft.explanation
      });
      if (activeSource.length >= 12) {
        const note = ' ' + SOURCE_TAG + activeSource.slice(0,200);
        if (normalized.explanation.length + note.length > 1000)
          throw new Error('Explanation + source reference exceed the 1000-character Firestore limit.');
        normalized.explanation += note;
      }
      // Never carry an old verification forward if a key changed without a new source.
      await updateDoc(doc(db,...PATH,selected.id), normalized);
      setSelected(null); setDraft(null);
      setMessage('Question updated. Public Quiz, Midterm and Finalterm lists refresh automatically.');
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  };
  // Correcting a mistaken subject must preserve question IDs, order, category,
  // options, answers, verification notes and any attempt references to IDs.
  // A single Firestore batch makes all 249 requested changes atomic.
  const moveSubject = async event => {
    event.preventDefault();
    const target = clean(bulkTarget);
    if (busy || loading || !adminPanelAccess(user)) return;
    setError(''); setMessage('');
    if (!COURSE.test(subject) || !COURSE.test(target) || target === subject) {
      setError('Enter a different valid destination subject code (for example, MGT611).');
      return;
    }
    if (!records.length || records.length > 450 || bulkCountConfirmation.trim() !== String(records.length)) {
      setError('Enter the exact number of loaded questions to confirm this subject correction (maximum 450 per operation).');
      return;
    }
    if (!window.confirm('Move ALL ' + records.length + ' published questions from ' + subject + ' to ' + target +
      '? Only the subject code will change. Existing questions under ' + target + ' will remain.')) return;
    setBusy(true);
    try {
      // Do not silently move a subset when the source has changed or exceeds
      // the single-transaction limit. Re-fetch before writing; this is important
      // when students/admins have added questions since the list was loaded.
      const fresh = await getDocs(query(collection(db,...PATH),where('subject','==',subject),limit(451)));
      const listedIds = new Set(records.map(item => item.id));
      if (fresh.size !== records.length || fresh.size > 450 ||
        fresh.docs.some(item => !listedIds.has(item.id))) {
        throw new Error('The source question list changed. Reload this subject and confirm the new count before trying again.');
      }
      const batch = writeBatch(db);
      fresh.docs.forEach(item => batch.update(item.ref, { subject: target }));
      await batch.commit();
      setSelected(null); setDraft(null);
      setSearch(''); setCategory('all');
      setBulkTarget(''); setBulkCountConfirmation('');
      setSubject(target);
      setMessage(fresh.size + ' questions moved from ' + subject + ' to ' + target +
        '. Question text, answer choices, keys, categories and document IDs were not changed.');
    } catch(err) {setError(errorText(err));}
    finally {setBusy(false);}
  };
  const remove = async q => {
    if (busy || !adminPanelAccess(user)) return;
    if (!window.confirm('Permanently delete this question from '+q.subject+' '+categoryOf(q)+'? Students’ past answer for this question will no longer appear. This cannot be undone.')) return;
    setBusy(true);setError('');setMessage('');
    try { await deleteDoc(doc(db,...PATH,q.id)); if(selected?.id===q.id){setSelected(null);setDraft(null);}
      setMessage('Question deleted. All other published questions and resources remain unchanged.');
    } catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  return <section className="edx-exam-card edx-exam-form edx-admin-mcqs" aria-label="Manage published MCQs">
    <div className="edx-exam-between"><div><h3>Manage published questions</h3>
      <p>Edit the question, choices, answer, subject, Quiz set or exam category; delete one question after confirmation.</p></div><ShieldCheck size={24}/></div>
    <div className="edx-exam-form-grid">
      <label className="edx-exam-field">Subject code<input value={subject} maxLength={12} disabled={busy}
        onChange={e=>setSubject(clean(e.target.value))} placeholder="CS620"/></label>
      <label className="edx-exam-field">Exam category<select value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}>
        <option value="all">All categories</option><option value="quiz">Quiz</option><option value="midterm">Midterm</option><option value="finalterm">Finalterm</option>
      </select></label>
    </div>
    <label className="edx-exam-field">Find a published question
      <span className="edx-practice-search"><Search size={17}/><input type="search" value={search}
      onChange={e=>setSearch(e.target.value)} placeholder="Search question, option or quiz set"/></span>
    </label>
    <div className="edx-exam-between"><span className="edx-exam-pill">{loading?'Loading…':filtered.length+' matching · '+records.length+' loaded'}</span>
      {records.length>=1000 && <small>First 1000 questions loaded for this subject. Narrow by subject; existing data is not deleted.</small>}</div>
    {!loading && records.length > 0 && <form className="edx-admin-subject-move" onSubmit={moveSubject} aria-label="Correct subject for all loaded questions">
      <h4>Correct a subject code for all questions</h4>
      <p>If an entire upload used the wrong subject, move only the {records.length} questions currently listed under <strong>{subject}</strong>. Other subjects and existing questions under the destination stay unchanged.</p>
      <div className="edx-exam-form-grid">
        <label className="edx-exam-field">Correct subject code<input aria-label="Correct subject code" value={bulkTarget} disabled={busy || records.length>450} maxLength={12} onChange={e=>setBulkTarget(clean(e.target.value))} placeholder="MGT611"/></label>
        <label className="edx-exam-field">Type {records.length} to confirm<input aria-label="Confirm number of questions" type="text" inputMode="numeric" value={bulkCountConfirmation} disabled={busy || records.length>450} onChange={e=>setBulkCountConfirmation(e.target.value.replace(/[^0-9]/g,'').slice(0,4))} placeholder={String(records.length)}/></label>
      </div>
      {records.length>450 && <small>This subject has too many questions for a single safe batch. No partial move will run.</small>}
      <button type="submit" className="edx-exam-secondary" disabled={busy || loading || records.length>450 || !COURSE.test(bulkTarget) || bulkTarget===subject || bulkCountConfirmation!==String(records.length)}>
        {busy?'Updating subject…':'Move '+records.length+' questions to '+(bulkTarget || 'correct subject')}
      </button>
    </form>}
    {message && <p className="edx-exam-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
    {error && <p className="edx-exam-alert" role="alert">{error}</p>}
    <div className="edx-admin-mcq-list">{filtered.map(q=><div className="edx-admin-mcq-row" key={q.id}>
      <div><span className="edx-exam-pill">{q.subject} · {categoryOf(q)} {categoryOf(q)==='quiz'?'· '+quizSetOf(q):''}</span>
        <strong>{q.question}</strong><small>{isVerifiedAnswer(q)?'Source-verified answer':'Answer needs source verification'} · {q.options?.length||0} choices</small></div>
      <div className="edx-admin-mcq-row-actions"><button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>openEdit(q)}><Pencil size={15}/> Edit</button>
      <button type="button" className="edx-exam-secondary edx-admin-danger" disabled={busy} onClick={()=>remove(q)}><Trash2 size={15}/> Delete</button></div>
    </div>)}</div>
    {!loading&&!filtered.length&&<p>No questions match. Select another subject or exam category.</p>}
    {selected&&draft&&<form className="edx-admin-mcq-editor" onSubmit={save} aria-label="Edit existing question">
      <div className="edx-exam-between"><h3>Edit question</h3><button type="button" className="edx-exam-secondary" onClick={()=>{setSelected(null);setDraft(null);}}><X size={15}/> Cancel</button></div>
      <div className="edx-exam-form-grid"><label className="edx-exam-field">Subject<input required value={draft.subject}
        onChange={e=>setDraft(v=>({...v,subject:clean(e.target.value)}))}/></label>
      <label className="edx-exam-field">Exam category<select value={draft.term}
        onChange={e=>setDraft(v=>({...v,term:e.target.value}))}>
        <option value="quiz">Regular Quiz</option><option value="midterm">Midterm</option><option value="finalterm">Finalterm</option>
      </select></label></div>
      {draft.term==='quiz'&&<label className="edx-exam-field">Quiz set / category<input maxLength={40} value={draft.quizSet}
        placeholder="QUIZ-1" onChange={e=>setDraft(v=>({...v,quizSet:e.target.value}))}/></label>}
      <label className="edx-exam-field">Question<textarea required rows={3} maxLength={1000} value={draft.question}
        onChange={e=>setDraft(v=>({...v,question:e.target.value}))}/></label>
      {draft.options.map((option,i)=><label key={i} className="edx-exam-field">Option {String.fromCharCode(65+i)}
        <input required maxLength={350} value={option} onChange={e=>setDraft(v=>({...v,options:v.options.map((o,j)=>j===i?e.target.value:o)}))}/></label>)}
      <label className="edx-exam-field">Correct answer<select value={draft.answer}
        onChange={e=>setDraft(v=>({...v,answer:Number(e.target.value)}))}>
        {draft.options.map((v,i)=><option key={i} value={i}>{String.fromCharCode(65+i)} — {v.slice(0,85)}</option>)}
      </select></label>
      <label className="edx-exam-field">Explanation<textarea rows={3} maxLength={750} value={draft.explanation}
        onChange={e=>setDraft(v=>({...v,explanation:e.target.value}))}/></label>
      <label className="edx-exam-field">Answer verification reference<input minLength={12} maxLength={200}
        placeholder="Handout or solved quiz source, lecture, page" value={draft.verificationSource}
        onChange={e=>setDraft(v=>({...v,verificationSource:e.target.value}))}/>
        <small>A NEW source is required when changing the question, options or answer. If you only edit its category or notes, a previously verified source remains attached. AI alone cannot verify an answer key.</small></label>
      <button type="submit" className="edx-exam-primary" disabled={busy}>{busy?'Saving…':'Save question changes'}</button>
    </form>}
  </section>;
}
