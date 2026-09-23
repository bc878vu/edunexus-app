import React, { useMemo, useRef, useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { CheckCircle2, FileJson2, UploadCloud, AlertTriangle } from 'lucide-react';
import { db } from './firebase-client';
import { adminPanelAccess } from './adminSession';
import { categoryOf, MAX_IMPORT, MAX_JSON_BYTES, parseMcqJson, summarizeImport, validateMcq } from './examMcqImport';
import './exam-mcq-import.css';

const MCQS = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'examMcqs');
const sample = '[{"subject":"CS620","term":"quiz","question":"Your question?","options":["A","B","C","D"],"answer":0,"explanation":"Verified answer explanation"}]';
const errorMessage = (error) => {
  if (error?.code === 'permission-denied') return 'Firestore rejected the import. Verify that this Firebase account is the email-verified administrator and the examMcqs rules permit admin writes.';
  if (error?.code === 'unauthenticated') return 'Your administrator session expired. Sign in again and retry.';
  if (error?.code === 'unavailable') return 'Firestore is currently unavailable. Check your connection and retry.';
  return error?.message || 'Could not import the questions. Please retry.';
};

export default function McqBulkImporter({ user, onView }) {
  const [bulk, setBulk] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [overrideSubject, setOverrideSubject] = useState('');
  const [overrideTerm, setOverrideTerm] = useState('keep');
  const [quizSet, setQuizSet] = useState('');
  const [verificationSource, setVerificationSource] = useState('');
  const [sourceChecked, setSourceChecked] = useState(false);
  const [destination, setDestination] = useState(null);
  const working = useRef(false);
  const chooser = useRef(null);

  const inspection = useMemo(() => {
    if (!bulk.trim()) return { summary: null, items: null, issue: '' };
    try {
      const items = parseMcqJson(bulk).map(item => ({ ...item,
        subject: overrideSubject.trim() || item.subject,
        term: overrideTerm === 'keep' ? item.term : overrideTerm,
        explanation: overrideTerm === 'midterm' || overrideTerm === 'finalterm'
          ? '[EduNexus ' + (overrideTerm === 'midterm' ? 'Midterm' : 'Finalterm') + '] ' + String(item.explanation || '').replace(/^\[EduNexus Quiz(?:\|set:[A-Z0-9_-]{1,40})?(?:\|order:[0-9]{4})?\]\s*/, '')
          : item.explanation,
        quizSet: (overrideTerm === 'quiz' || (overrideTerm === 'keep' && categoryOf(item) === 'quiz')) ? quizSet.trim() || item.quizSet : item.quizSet
      }));
      return { summary: summarizeImport(items), items, issue: '' };
    } catch (cause) { return { summary: null, items: null, issue: cause.message }; }
  }, [bulk, overrideSubject, overrideTerm, quizSet]);
  const mustVerify = Boolean(inspection.summary && (inspection.summary.provisional || inspection.summary.answerConflicts));
  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(''); setSuccess(''); setVerified(false); setDestination(null);
    if (!/\.json$/i.test(file.name) || file.size > MAX_JSON_BYTES) {
      setError('Select a .json file under 2 MiB (maximum 200 questions).');
      return;
    }
    try { setBulk(await file.text()); setSourceName(file.name); }
    catch (_) { setError('Could not read the JSON file. Try copying its contents into the text area.'); }
  };
  const importMany = async (event) => {
    event.preventDefault();
    if (working.current) return;
    setError(''); setSuccess(''); setDestination(null);
    if (!inspection.items) { setError(inspection.issue || 'Select a JSON file or paste an array of questions.'); return; }
    if (sourceChecked && verificationSource.trim().length < 12) {
      setError('Enter a specific course handout or trusted answer-key reference (at least 12 characters) for the batch you have independently verified.'); return;
    }
    if (sourceChecked && mustVerify && !verified) {
      setError('Some imported answers conflict with their source. Resolve each conflict before marking the whole batch verified, or uncheck batch verification to publish them as provisional.'); return;
    }
    if (!adminPanelAccess(user)) {
      setError('Sign in with the verified EduNexus administrator account before importing.'); return;
    }
    working.current = true; setBusy(true);
    try {
      await user.getIdToken(true);
      const items = inspection.items.map((item, index) => {
        const normalized = validateMcq(item, index, { forImport: true });
        if (sourceChecked) {
          const note = ' [EduNexus admin verified] Admin review source: ' + verificationSource.trim().slice(0,200);
          if (normalized.explanation.length + note.length > 1000) throw new Error('Question ' + (index+1) + ': explanation and reference exceed the 1000-character limit.');
          normalized.explanation += note;
        }
        return { ...normalized, createdAt: serverTimestamp() };
      });
      const batch = writeBatch(db);
      items.forEach((item) => batch.set(doc(MCQS), item));
      await batch.commit();
      const first = inspection.items[0];
      const onlyOneCategory = Object.values(inspection.summary.totals).filter(Boolean).length === 1;
      setDestination({ subject: inspection.summary.subjects.length === 1 ? inspection.summary.subjects[0] : '',
        category: onlyOneCategory ? categoryOf(first) : '' });
      setSuccess(items.length + ' questions published successfully. Original order and subject/category are preserved. ' + (sourceChecked ? 'Administrator-reviewed answer references are saved for verified scoring.' : 'Answer indexes stay provisional for scoring until independently verified by an administrator.'));
      setBulk(''); setSourceName(''); setVerified(false); setSourceChecked(false);
      if (chooser.current) chooser.current.value = '';
    } catch (cause) {
      setError('Import failed: ' + errorMessage(cause) + ' Your JSON has been kept so you can correct or retry it.');
    } finally { working.current = false; setBusy(false); }
  };

  return <section className="edx-exam-card edx-exam-form edx-importer" aria-labelledby="edx-import-title">
    <div className="edx-import-head"><div><h3 id="edx-import-title">Bulk import MCQs</h3>
      <p>Upload one JSON file or paste a JSON array (up to {MAX_IMPORT} questions per batch). Set a subject, Quiz set and exam category for the whole batch, or preserve each question’s existing values. Multiple Quiz sets can be included in one JSON file.</p></div>
      <FileJson2 size={27} aria-hidden="true"/></div>
    <form onSubmit={importMany} noValidate>
      <label className="edx-import-file">Choose a JSON file
        <input type="file" accept=".json,application/json" ref={chooser} disabled={busy} onChange={selectFile}/>
        {sourceName && <span className="edx-import-file-name">Selected: {sourceName}</span>}
      </label>
      <div className="edx-exam-form-grid"><label className="edx-exam-field">Apply subject to this batch (optional)
        <input maxLength={10} placeholder="e.g. CS620 · blank keeps original" value={overrideSubject} onChange={e=>setOverrideSubject(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/></label>
        <label className="edx-exam-field">Exam type for this batch<select value={overrideTerm} onChange={e=>setOverrideTerm(e.target.value)}><option value="keep">Keep each question’s category</option><option value="quiz">Regular Quiz</option><option value="midterm">Midterm</option><option value="finalterm">Finalterm</option></select></label></div>
      {(overrideTerm === 'quiz' || (overrideTerm === 'keep' && inspection.summary?.totals.quiz > 0)) && <label className="edx-exam-field">Quiz set name (optional; applies to all Quiz questions)<input maxLength={40} placeholder="e.g. QUIZ-1, QUIZ-2 · blank keeps each question’s set" value={quizSet} onChange={e=>setQuizSet(e.target.value)}/></label>}
      <label className="edx-exam-field" htmlFor="edx-mcq-import-paste">Or paste JSON content</label>
      <textarea id="edx-mcq-import-paste" aria-label="MCQ JSON import" rows={7} spellCheck={false}
        value={bulk} disabled={busy} onChange={(event) => { setBulk(event.target.value); setSourceName(''); setError(''); setSuccess(''); setVerified(false); setDestination(null); }}
        placeholder={sample}/>
      {inspection.issue && <div className="edx-exam-alert" role="alert">{inspection.issue}</div>}
      {inspection.summary && <div className="edx-import-summary" role="status">
        <strong>{inspection.summary.count} questions ready for validation</strong>
        <span>Subjects: {inspection.summary.subjects.join(', ')}</span>
        <span>Quiz: {inspection.summary.totals.quiz} · Midterm: {inspection.summary.totals.midterm} · Finalterm: {inspection.summary.totals.finalterm}</span>
        {mustVerify && <div className="edx-import-warning"><AlertTriangle size={18}/>
          <p>{inspection.summary.provisional} provisional answers and {inspection.summary.answerConflicts} possible answer-key conflicts detected. Original source files did not verify these answers. Check them before making the quiz public.</p></div>}
      </div>}
      <label className="edx-import-confirm"><input type="checkbox" checked={sourceChecked} disabled={busy} onChange={e=>setSourceChecked(e.target.checked)}/><span>I personally checked EVERY answer in this batch against the named reference; mark the answer keys source-verified for scoring.</span></label>
      {sourceChecked && <label className="edx-exam-field">Verified source for ALL answers<input required maxLength={200} minLength={12} value={verificationSource} onChange={e=>setVerificationSource(e.target.value)} placeholder="e.g. CS620 official solved Quiz 1, questions 1–20"/></label>}
      {sourceChecked && mustVerify && <label className="edx-import-confirm"><input type="checkbox" checked={verified} disabled={busy} onChange={e=>setVerified(e.target.checked)}/><span>I resolved the provisional/conflicting source answers individually. Otherwise import them without verified scoring.</span></label>}
      {error && <div className="edx-exam-alert edx-import-result" role="alert">{error}</div>}
      {success && <div className="edx-exam-success edx-import-result" role="status"><CheckCircle2 size={18}/>{success}
        {destination?.subject && destination?.category && <a className="edx-exam-secondary" href={'/?page=exam-prep&subject=' + encodeURIComponent(destination.subject) + '&term=' + encodeURIComponent(destination.category)} target="_blank" rel="noopener noreferrer">Open public {destination.subject} {destination.category}</a>}
        {destination?.subject && destination?.category && <button type="button" className="edx-exam-secondary"
          onClick={() => onView?.(destination.subject, destination.category)}>View {destination.subject} {destination.category === 'quiz' ? 'Quiz' : destination.category === 'midterm' ? 'Midterm' : 'Finalterm'}</button>}</div>}
      <button type="submit" className="edx-exam-primary edx-import-submit" disabled={busy || !inspection.items || (sourceChecked && verificationSource.trim().length < 12) || (sourceChecked && mustVerify && !verified)}>
        <UploadCloud size={17}/>{busy ? 'Publishing questions…' : inspection.summary ? 'Import ' + inspection.summary.count + ' questions' : 'Import questions'}
      </button>
      <p className="edx-import-note">The existing Firestore collection is retained. Files with missing/null answer indexes cannot be imported. No original files or existing MCQs are deleted.</p>
    </form>
  </section>;
}
