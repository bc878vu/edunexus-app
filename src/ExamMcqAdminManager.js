import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Pencil, Search, Trash2, X } from 'lucide-react';
import { adminPanelAccess } from './adminSession';
import { listMcqs, updateMcq, deleteMcqs, setMcqActive } from './db/examMcqs';
import { categoryOf, orderOf, quizSetOf, stripQuizMarker, validateMcq } from './examMcqImport';
import { refreshExamCatalogCounts } from './examCatalogCounts';
import { readCatalogFromSupabase } from './examCatalogCounts';
import { explanationForStudent } from './examAnswerFeedback';
import { isVerifiedAnswer } from './examPractice';
import RichContent from './RichContent';
import { useConfirm } from './ConfirmDialog';

const COURSE = /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/;
const clean = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
const SOURCE_TAG = '[EduNexus admin verified] Admin review source: ';
const fromRecord = q => ({
  subject:q.subject, term:categoryOf(q), quizSet:quizSetOf(q), question:q.question,
  options:[...q.options], answer:q.answer, explanation:explanationForStudent(q),
  verificationSource:''
});
const errorText = e => e?.code === 'permission-denied' ? 'Database denied this change. Reopen the verified Admin Panel and try again.' : e?.message || 'Action could not be completed. Try again.';

export default function ExamMcqAdminManager({ user, initialSubject='CS620' }) {
  const { requestConfirm, ConfirmUI } = useConfirm();
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
  const [deletingBatch, setDeletingBatch] = useState('');
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [catalogueInfo, setCatalogueInfo] = useState('');
  const [bankStats, setBankStats] = useState(null);
  const [bankStatsError, setBankStatsError] = useState('');
  const refreshCatalogue = () => {
    if (rebuilding || busy) return;
    requestConfirm({
      message: 'Refresh the public exam catalogue? This recounts every subject straight from the question bank and updates the public Exam Prep numbers.',
      confirmLabel: 'Refresh',
      onConfirm: async () => {
        setRebuilding(true); setError(''); setMessage('Refreshing catalogue…'); setCatalogueInfo('');
        try {
          const { updated, total } = await refreshExamCatalogCounts('all');
          setCatalogueInfo(updated.length + ' subjects · ' + total.toLocaleString() + ' questions');
          loadBankStats();
          setMessage('Catalogue refreshed: ' + updated.length + ' subjects, ' + total.toLocaleString() + ' questions. The public Exam Prep numbers are now up to date.');
        } catch (e) { setError(e?.message || 'Catalogue refresh failed. Try again.'); }
        finally { setRebuilding(false); }
      },
    });
  };

  // Question bank reads through the examMcqs adapter (Supabase primary), the
  // same store the public practice page and the single-MCQ publisher use.
  const loadRecords = async () => {
    if (!adminPanelAccess(user) || !COURSE.test(subject)) { setRecords([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const items = await listMcqs({ subject, activeOnly: false, limit: 1000 });
      const ts = v => { const t = new Date(v?.createdAt || 0).getTime(); return Number.isNaN(t) ? 0 : t; };
      setRecords(items.sort((a,b) => (ts(b.createdAt)-ts(a.createdAt)) || String(a.id).localeCompare(String(b.id))));
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadRecords(); }, [subject, user]);
  // Bank-wide graph: one cheap read of the pre-computed exam catalogue
  // (Quiz / Midterm / Finalterm per subject). Refreshes after a catalogue
  // recount so the graph never shows stale public numbers.
  const loadBankStats = async () => {
    if (!adminPanelAccess(user)) { setBankStats(null); return; }
    try {
      const { bySubject, updatedAt } = await readCatalogFromSupabase();
      setBankStats({ bySubject: bySubject || {}, updatedAt: updatedAt || null });
      setBankStatsError('');
    } catch (e) { setBankStatsError('Stats unavailable right now.'); }
  };
  useEffect(() => { loadBankStats(); }, [user]);

  const uploadBatches = useMemo(() => {
    const map = new Map();
    records.forEach(q => {
      // Primary: tracked batch ID. Fallback: group old imports by sourceFileName
      const key = q.importBatchId ? 'id:' + String(q.importBatchId) : (q.sourceFileName ? 'file:' + String(q.sourceFileName) : null);
      if (!key) return;
      const current = map.get(key) || { id:key, batchId:q.importBatchId||null, fileName:q.sourceFileName||null, name:q.sourceFileName || 'JSON upload', count:0, categories:new Set(), tracked:!!q.importBatchId };
      current.count += 1; current.categories.add(categoryOf(q)); map.set(key,current);
    });
    return [...map.values()].map(item => ({...item,categories:[...item.categories]}));
  }, [records]);
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
      await updateMcq(selected.id, normalized);
      await loadRecords();
      // An edit can change the subject and/or exam category, so recompute the
      // denormalized catalogue for both the old and the new subject.
      try { await refreshExamCatalogCounts([selected.subject, draft.subject]); }
      catch (_) {}
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
    requestConfirm({
      message: 'Move ALL ' + records.length + ' published questions from ' + subject + ' to ' + target +
        '? Only the subject code will change. Existing questions under ' + target + ' will remain.',
      confirmLabel: 'Move all',
      onConfirm: async () => {
    setBusy(true);
    try {
      // Do not silently move a subset when the source has changed or exceeds
      // the single-transaction limit. Re-fetch before writing; this is important
      // when students/admins have added questions since the list was loaded.
      const fresh = await listMcqs({ subject, activeOnly: false, limit: 451 });
      const listedIds = new Set(records.map(item => item.id));
      if (fresh.length !== records.length || fresh.length > 450 ||
        fresh.some(item => !listedIds.has(item.id))) {
        throw new Error('The source question list changed. Reload this subject and confirm the new count before trying again.');
      }
      for (const item of fresh) await updateMcq(item.id, { subject: target });
      await loadRecords();
      // Recompute the denormalized catalogue for the emptied source subject
      // and the destination subject.
      try { await refreshExamCatalogCounts([subject, target]); }
      catch (_) {}
      setSelected(null); setDraft(null);
      setSearch(''); setCategory('all');
      setBulkTarget(''); setBulkCountConfirmation('');
      setSubject(target);
      setMessage(fresh.length + ' questions moved from ' + subject + ' to ' + target +
        '. Question text, answer choices, keys, categories and document IDs were not changed.');
    } catch(err) {setError(errorText(err));}
    finally {setBusy(false);}
      },
    });
    return;
  };
  const batchRecordsOf = upload => records.filter(q =>
    upload.tracked ? q.importBatchId === upload.batchId : (q.sourceFileName === upload.fileName && !q.importBatchId)
  );
  const removeUploadBatch = async upload => {
    if (busy || loading || !adminPanelAccess(user) || !upload?.id) return;
    const batchRecords = batchRecordsOf(upload);
    if (!batchRecords.length) return;
    requestConfirm({
      message: 'Permanently delete the complete uploaded JSON file "' + upload.name + '" (' + batchRecords.length + ' questions) from ' + subject + '? Individual-question delete will remain available. Other uploads, study files and existing content will not be changed. This cannot be undone.',
      confirmLabel: 'Delete all',
      danger: true,
      onConfirm: async () => {
    setBusy(true); setDeletingBatch(upload.id); setError(''); setMessage('');
    try {
      const fresh = await listMcqs({ subject, activeOnly: false, limit: 1000 });
      // For untracked batches, only delete records that truly lack importBatchId (safety)
      const docs = fresh.filter(q => upload.tracked ? q.importBatchId === upload.batchId
        : (q.subject === subject && q.sourceFileName === upload.fileName && !q.importBatchId));
      if (docs.length !== batchRecords.length || docs.length > 900) throw new Error('This upload changed while it was open. Reload the subject and try again so no partial delete can occur.');
      const deleted = docs.length;
      await deleteMcqs(docs.map(q => q.id));
      await loadRecords();
      if (selected && batchRecords.some(q => q.id === selected.id)) { setSelected(null); setDraft(null); }
      try { await refreshExamCatalogCounts([subject]); }
      catch (_) {}
      setMessage(deleted + ' questions from "' + upload.name + '" deleted together. No other upload or site content was changed.');
    } catch(e) { setError(errorText(e)); }
    finally { setBusy(false); setDeletingBatch(''); }
      },
    });
    return;
  };
  // Delete ALL questions currently listed (subject + exam category as shown).
  // This is the escape hatch for older imports that carry no importBatchId or
  // sourceFileName, so no grouped upload appears above. Deletes exactly the
  // documents listed, in 450-doc chunks; deleting a missing doc is a no-op.
  const removeAllListed = async event => {
    event.preventDefault();
    if (busy || loading || !adminPanelAccess(user)) return;
    setError(''); setMessage('');
    const targets = filtered;
    if (!targets.length || deleteAllConfirm.trim() !== String(targets.length)) {
      setError('Type the exact number of listed questions (' + targets.length + ') to confirm this full delete.');
      return;
    }
    const scopeLabel = subject + (category !== 'all' ? ' · ' + category : '');
    requestConfirm({
      message: 'Permanently delete ALL ' + targets.length + ' listed questions (' + scopeLabel + ')? This is the complete-file delete and cannot be undone. Other subjects and site content will not change.',
      confirmLabel: 'Delete all',
      danger: true,
      onConfirm: async () => {
    setBusy(true); setDeletingAll(true);
    try {
      const deleted = targets.length;
      await deleteMcqs(targets.map(q => q.id));
      await loadRecords();
      if (selected && targets.some(q => q.id === selected.id)) { setSelected(null); setDraft(null); }
      setDeleteAllConfirm(''); setSearch('');
      try { await refreshExamCatalogCounts([subject]); }
      catch (_) {}
      setMessage(deleted + ' questions (' + scopeLabel + ') deleted together. No other subject or site content was changed.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); setDeletingAll(false); }
      },
    });
    return;
  };
  const remove = async q => {
    if (busy || !adminPanelAccess(user)) return;
    requestConfirm({
      message: 'Permanently delete this question from '+q.subject+' '+categoryOf(q)+'? Students’ past answer for this question will no longer appear. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
    setBusy(true);setError('');setMessage('');
    try { await deleteMcqs([q.id]); await loadRecords(); if(selected?.id===q.id){setSelected(null);setDraft(null);}
      try { await refreshExamCatalogCounts([q.subject]); }
      catch (_) {}
      setMessage('Question deleted. All other published questions and resources remain unchanged.');
    } catch(e){setError(errorText(e));}finally{setBusy(false);}
      },
    });
  };
  const toggleActive = async q => {
    if (busy || !adminPanelAccess(user)) return;
    const next = q.isActive === false ? true : false;
    const action = next ? 'activate' : 'disable';
    requestConfirm({
      message: action === 'disable'
        ? 'Disable this question? It will be hidden from students but can be re-enabled anytime.'
        : 'Activate this question? It will be visible to students again.',
      confirmLabel: action === 'disable' ? 'Disable' : 'Activate',
      onConfirm: async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      await setMcqActive([q.id], next);
      await loadRecords();
      try { await refreshExamCatalogCounts([q.subject]); }
      catch (_) {}
      setMessage(next ? 'Question activated.' : 'Question disabled. It is now hidden from students.');
    } catch(e){setError(errorText(e));}finally{setBusy(false);}
      },
    });
  };
  const toggleBatchActive = async upload => {
    if (busy || loading || !adminPanelAccess(user) || !upload?.id) return;
    const batchRecords = batchRecordsOf(upload);
    if (!batchRecords.length) return;
    const disabledCount = batchRecords.filter(q => q.isActive === false).length;
    const next = disabledCount > batchRecords.length / 2 ? true : false;
    const action = next ? 'activate' : 'disable';
    requestConfirm({
      message: action === 'disable'
        ? 'Disable ALL ' + batchRecords.length + ' questions from "' + upload.name + '"? They will be hidden from students but can be re-enabled anytime.'
        : 'Activate ALL ' + batchRecords.length + ' questions from "' + upload.name + '"? They will be visible to students again.',
      confirmLabel: action === 'disable' ? 'Disable all' : 'Activate all',
      onConfirm: async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const fresh = await listMcqs({ subject, activeOnly: false, limit: 1000 });
      const docs = fresh.filter(q => upload.tracked ? q.importBatchId === upload.batchId
        : (q.subject === subject && q.sourceFileName === upload.fileName && !q.importBatchId));
      const updated = docs.length;
      await setMcqActive(docs.map(q => q.id), next);
      await loadRecords();
      try { await refreshExamCatalogCounts([subject]); }
      catch (_) {}
      setMessage(updated + ' questions from "' + upload.name + '" ' + (next ? 'activated.' : 'disabled.'));
    } catch(e){setError(errorText(e));}finally{setBusy(false);}
      },
    });
    return;
  };
  return <section className="edx-exam-card edx-exam-form edx-admin-mcqs" aria-label="Manage published MCQs">
    <div style={{border:'2px solid #4C4FE0', borderRadius:12, padding:16, background:'#F8FAFF', marginBottom:16}} aria-label="Exam catalogue">
      <h3 style={{margin:'0 0 6px', display:'flex', alignItems:'center', gap:8}}><BookOpen size={20}/> Exam Catalogue</h3>
      <p style={{margin:'0 0 10px'}}>The catalogue is the subject list the public Exam Prep page shows — every subject with its question counts (Quiz / Midterm / Finalterm), e.g. “MGT610 · Midterm 126”. It is a pre-computed summary so the page loads instantly instead of counting 21,000+ questions on every visit. <strong>Refresh Catalogue</strong> recounts every subject straight from the question bank and updates those public numbers. Use it after imports or deletions, or whenever the public counts look wrong.</p>
      <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
        <button type="button" className="edx-exam-secondary" disabled={busy || rebuilding} onClick={refreshCatalogue} title="Recount every subject from the question bank and update the public Exam Prep numbers">{rebuilding ? 'Refreshing…' : 'Refresh Catalogue'}</button>
        {catalogueInfo && <span className="edx-exam-pill">{catalogueInfo}</span>}
      </div>
    </div>
    {(() => {
      if (bankStatsError) return <div style={{border:'1px solid #e2e8f0', borderRadius:12, padding:16, background:'#fff', marginBottom:16}}><h3 style={{margin:'0 0 6px'}}>📊 MCQ bank stats</h3><p style={{margin:0}}>{bankStatsError}</p></div>;
      if (!bankStats) return <div style={{border:'1px solid #e2e8f0', borderRadius:12, padding:16, background:'#fff', marginBottom:16}}><h3 style={{margin:'0 0 6px'}}>📊 MCQ bank stats</h3><p style={{margin:0}}>Loading bank totals…</p></div>;
      const entries = Object.entries(bankStats.bySubject).map(([code, c]) => ({ code, quiz: c.quiz || 0, midterm: c.midterm || 0, finalterm: c.finalterm || 0, total: (c.quiz || 0) + (c.midterm || 0) + (c.finalterm || 0) })).filter((e) => e.total > 0);
      const total = entries.reduce((n, e) => n + e.total, 0);
      const quiz = entries.reduce((n, e) => n + e.quiz, 0);
      const midterm = entries.reduce((n, e) => n + e.midterm, 0);
      const finalterm = entries.reduce((n, e) => n + e.finalterm, 0);
      const top = [...entries].sort((a, b) => b.total - a.total).slice(0, 8);
      const maxTop = top.length ? top[0].total : 1;
      const bar = (n, color) => <div style={{height:8, borderRadius:99, background:'#e2e8f0', overflow:'hidden', marginTop:6}}><div style={{height:'100%', borderRadius:99, background:color, width: (total ? (n / total * 100) : 0) + '%'}} /></div>;
      return <div style={{border:'1px solid #e2e8f0', borderRadius:12, padding:16, background:'#fff', marginBottom:16}} aria-label="MCQ bank stats">
        <h3 style={{margin:'0 0 4px'}}>📊 MCQ bank stats ({total.toLocaleString()} questions · {entries.length} subjects)</h3>
        <p style={{margin:'0 0 12px', fontSize:13, color:'#64748b'}}>Public catalogue counts{bankStats.updatedAt ? ' · last recount ' + new Date(bankStats.updatedAt).toLocaleString() : ''}. Refresh Catalogue above after imports or deletions to update these numbers.</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:14}}>
          <div><strong style={{fontSize:20}}>{quiz.toLocaleString()}</strong><div style={{fontSize:12, color:'#64748b', fontWeight:700}}>Quiz</div>{bar(quiz, '#8b5cf6')}</div>
          <div><strong style={{fontSize:20}}>{midterm.toLocaleString()}</strong><div style={{fontSize:12, color:'#64748b', fontWeight:700}}>Midterm</div>{bar(midterm, '#4C4FE0')}</div>
          <div><strong style={{fontSize:20}}>{finalterm.toLocaleString()}</strong><div style={{fontSize:12, color:'#64748b', fontWeight:700}}>Finalterm</div>{bar(finalterm, '#10b981')}</div>
        </div>
        <p style={{margin:'0 0 8px', fontSize:12, color:'#64748b', fontWeight:700}}>Top subjects by question count</p>
        <div style={{display:'grid', gap:8}}>
          {top.map((e) => <div key={e.code} style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{width:90, flexShrink:0, fontSize:12, fontWeight:700}}>{e.code}</span>
            <div style={{flex:1, height:12, borderRadius:99, background:'#e2e8f0', overflow:'hidden'}}><div style={{height:'100%', borderRadius:99, background:'#4C4FE0', width: (e.total / maxTop * 100) + '%'}} /></div>
            <span style={{fontSize:12, fontWeight:700}}>{e.total.toLocaleString()}</span>
          </div>)}
          {!top.length && <p style={{margin:0, fontSize:13}}>No catalogue subjects yet.</p>}
        </div>
      </div>;
    })()}
    <div className="edx-exam-between"><div><h3>Manage published questions</h3>
      <p>Edit the question, choices, answer, subject, Quiz set or exam category; delete one question or a complete tracked JSON upload after confirmation.</p></div></div>
    <div className="edx-exam-form-grid">
      <label className="edx-exam-field">Subject code<input value={subject} maxLength={12} disabled={busy}
        onChange={e=>setSubject(clean(e.target.value))} placeholder="CS620"/></label>
      <label className="edx-exam-field">Exam category<select value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}>
        <option value="all">All categories</option><option value="quiz">Quiz</option><option value="midterm">Midterm</option><option value="finalterm">Finalterm</option>
      </select></label>
    </div>
    {!loading && uploadBatches.length > 0 && <div className="edx-admin-subject-move" aria-label="Delete complete JSON uploads" style={{border:'2px solid #ef4444', borderRadius:12, padding:16, background:'#fef2f2'}}>
      <h4 style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 4px'}}><Trash2 size={18} style={{color:'#dc2626'}}/> Uploaded JSON files — delete complete file</h4>
      <p style={{margin:'0 0 8px'}}>Delete a complete imported JSON batch in one action. Individual question Edit/Delete buttons below stay available.</p>
      {uploadBatches.map(upload => {
        const batchQs = batchRecordsOf(upload);
        const disCount = batchQs.filter(q => q.isActive === false).length;
        const allDisabled = disCount === batchQs.length && batchQs.length > 0;
        return <div className="edx-exam-between" key={upload.id} style={{gap:12,marginTop:10,padding:10,background:'#fff',borderRadius:8,border:'1px solid #fecaca'}}>
        <span><strong>{upload.name}</strong>{!upload.tracked && <span style={{marginLeft:8,fontSize:11,background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:10,fontWeight:700}}>Old upload</span>}<br/><small>{upload.count} questions · {upload.categories.join(', ')}{allDisabled ? ' · Disabled' : disCount > 0 ? ' · ' + disCount + ' disabled' : ''}</small></span>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>toggleBatchActive(upload)}>{allDisabled ? 'Activate all' : 'Disable all'}</button>
          <button type="button" className="edx-exam-secondary edx-admin-danger" disabled={busy} onClick={()=>removeUploadBatch(upload)}><Trash2 size={15}/> {deletingBatch===upload.id?'Deleting upload…':'Delete complete file'}</button>
        </div>
      </div>})}}
    </div>}
    {!loading && filtered.length > 0 && <form className="edx-admin-subject-move" onSubmit={removeAllListed} aria-label="Delete all listed questions" style={{border:'2px solid #ef4444', borderRadius:12, padding:16, background:'#fef2f2'}}>
      <h4 style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 4px'}}><Trash2 size={18} style={{color:'#dc2626'}}/> Delete complete file — all listed questions</h4>
      <p style={{margin:'0 0 8px'}}>Delete all <strong>{filtered.length}</strong> questions currently listed below ({subject}{category !== 'all' ? ' · ' + category : ''}) in one action. Use this when the "Uploaded JSON files" section above shows no grouped upload (older imports). Individual Edit/Delete buttons below stay available.{records.length >= 1000 ? ' Only the first 1000 loaded questions will be deleted.' : ''}</p>
      <div className="edx-exam-form-grid">
        <label className="edx-exam-field">Type {filtered.length} to confirm<input aria-label="Confirm number of questions to delete" type="text" inputMode="numeric" value={deleteAllConfirm} disabled={busy} onChange={e=>setDeleteAllConfirm(e.target.value.replace(/[^0-9]/g,'').slice(0,4))} placeholder={String(filtered.length)}/></label>
      </div>
      <button type="submit" className="edx-exam-secondary edx-admin-danger" disabled={busy || loading || !filtered.length || deleteAllConfirm.trim() !== String(filtered.length)}>
        {deletingAll ? 'Deleting questions…' : 'Delete all ' + filtered.length + ' questions'}
      </button>
    </form>}
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
      <div><span className="edx-exam-pill">{q.subject} · {categoryOf(q)} {categoryOf(q)==='quiz'?'· '+quizSetOf(q):''}</span>{q.isActive === false && <span className="edx-exam-pill" style={{background:'#fee2e2',color:'#991b1b',marginLeft:6}}>Disabled</span>}
        <strong><RichContent value={q.question}/></strong><small>{isVerifiedAnswer(q)?'Source-verified answer':'Answer needs source verification'} · {q.options?.length||0} choices</small></div>
      <div className="edx-admin-mcq-row-actions"><button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>openEdit(q)}><Pencil size={15}/> Edit</button>
      <button type="button" className="edx-exam-secondary" disabled={busy} onClick={()=>toggleActive(q)}>{q.isActive === false ? 'Activate' : 'Disable'}</button>
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
        <textarea required rows={2} maxLength={350} value={option} onChange={e=>setDraft(v=>({...v,options:v.options.map((o,j)=>j===i?e.target.value:o)}))}/></label>)}
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
      <ConfirmUI />
    </section>;
}