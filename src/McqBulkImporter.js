import React, { useMemo, useRef, useState } from 'react';
import { addMcqBatch } from './db/examMcqs';
import { getAccessToken } from './db/auth';
import { CheckCircle2, FileJson2, UploadCloud, AlertTriangle } from 'lucide-react';
import { adminPanelAccess } from './adminSession';
import { categoryOf, MAX_IMPORT, MAX_JSON_BYTES, parseMcqJson, summarizeImport, suggestImportMetadata, validateMcq } from './examMcqImport';
import { refreshExamCatalogCounts } from './examCatalogCounts';
import './exam-mcq-import.css';

const sample = '[{"subject":"CS620","term":"quiz","question":"Your question?","options":["A","B","C","D"],"answer":0,"explanation":"Verified answer explanation"}]';
const errorMessage = (error) => {
  if (error?.code === 'permission-denied') return 'Firestore rejected the import. Verify that this Firebase account is the email-verified administrator and the examMcqs rules permit admin writes.';
  if (error?.code === 'unauthenticated') return 'Your administrator session expired. Sign in again and retry.';
  if (error?.code === 'unavailable') return 'Firestore is currently unavailable. Check your connection and retry.';
  return error?.message || 'Could not import the questions. Please retry.';
};


// Locate top-level JSON array objects without changing their original text or formulas.
const jsonQuestionLocations = (source) => {
  const locations = [];
  let quoted = false, escaped = false, depth = 0, start = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        locations.push({ start, end: i + 1, line: source.slice(0, start).split('\n').length });
        start = -1;
      }
    }
  }
  return locations;
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
  const [progress, setProgress] = useState('');
  const working = useRef(false);
  const chooser = useRef(null);
  const jsonEditor = useRef(null);
  const locations = useMemo(() => jsonQuestionLocations(bulk), [bulk]);
  const goToQuestion = number => {
    const location = locations[number - 1];
    const editor = jsonEditor.current;
    if (!location || !editor) return;
    editor.focus();
    editor.setSelectionRange(location.start, location.end);
    const lineHeight = parseFloat(window.getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, (location.line - 3) * lineHeight);
  };

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
      const valid = []; const rejected = [];
      items.forEach((item, index) => { try { validateMcq(item, index, { forImport: true }); if (item.answerMismatch) throw new Error('correct_answer does not match the selected option.'); valid.push(item); } catch (e) { rejected.push({ number: index + 1, id: item?.id, reason: e.message }); } });
      return { summary: valid.length ? summarizeImport(valid) : null, items: valid, rejected, total: items.length, issue: '' };
    } catch (cause) { return { summary: null, items: null, rejected: [], issue: cause.message }; }
  }, [bulk, overrideSubject, overrideTerm, quizSet]);
  const mustVerify = Boolean(inspection.summary && (inspection.summary.provisional || inspection.summary.answerConflicts));
  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(''); setSuccess(''); setVerified(false); setDestination(null);
    if (!/\.json$/i.test(file.name) || file.size > MAX_JSON_BYTES) {
      setError('Select a .json file under 32 MiB. Split larger files into multiple JSON files.');
      return;
    }
    try { const contents = await file.text(); const parsed = parseMcqJson(contents); const suggestion = suggestImportMetadata(file.name, parsed);
      setBulk(contents); setSourceName(file.name);
      if (suggestion.subject) setOverrideSubject(suggestion.subject);
      setOverrideTerm(suggestion.category === 'mixed' ? 'keep' : suggestion.category);
    }
    catch (_) { setError('Could not read the JSON file. Try copying its contents into the text area.'); }
  };
  const importMany = async (event) => {
    event.preventDefault();
    if (working.current) return;
    setError(''); setSuccess(''); setDestination(null);
    if (!inspection.items?.length) { setError(inspection.issue || 'Select a JSON file or paste an array of questions.'); return; }
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
      await getAccessToken();
      // Every import gets one immutable batch ID so the Admin Panel can later
      // remove exactly this uploaded JSON file without touching other MCQs.
      const importBatchId = (window.crypto?.randomUUID?.() ||
        ('batch-' + Date.now() + '-' + Math.random().toString(36).slice(2))).slice(0,80);
      const sourceFileName = (sourceName.trim() || 'Pasted JSON').slice(0,120);
      const items = inspection.items.map((item, index) => {
        const normalized = validateMcq(item, index, { forImport: true });
        if (sourceChecked) {
          const note = ' [EduNexus admin verified] Admin review source: ' + verificationSource.trim().slice(0,200);
          if (normalized.explanation.length + note.length > 1000) throw new Error('Question ' + (index+1) + ': explanation and reference exceed the 1000-character limit.');
          normalized.explanation += note;
        }
        return { ...normalized, importBatchId, sourceFileName, createdAt: new Date() };
      });
      let published = 0;
      for (let start = 0; start < items.length; start += 100) {
        try { await addMcqBatch(items.slice(start, start + 100)); }
        catch (cause) {
          throw new Error(published + ' questions were published before this batch failed. Check for duplicates before retrying. ' + errorMessage(cause));
        }
        published += Math.min(100, items.length - start);
        setProgress(published + ' / ' + items.length + ' published');
      }
      // Refresh the denormalized exam catalogue for every subject this import
      // touched. Best-effort: if it fails, the counts document stays stale and
      // ExamPrepHub falls back to its legacy scan, so the import itself is
      // never blocked by a catalogue refresh.
      try { await refreshExamCatalogCounts(items.map((item) => item.subject)); }
      catch (_) {}
      const first = inspection.items[0];
      const onlyOneCategory = Object.values(inspection.summary.totals).filter(Boolean).length === 1;
      setDestination({ subject: inspection.summary.subjects.length === 1 ? inspection.summary.subjects[0] : '',
        category: onlyOneCategory ? categoryOf(first) : '' });
      setSuccess(items.length + ' questions published successfully as one managed upload batch. You can delete this complete JSON upload later from Manage published questions. ' + (inspection.rejected?.length ? inspection.rejected.length + ' invalid questions skipped for review. ' : '') + ' Original order and subject/category are preserved. ' + (sourceChecked ? 'Administrator-reviewed answer references are saved for verified scoring.' : 'Answer indexes stay provisional for scoring until independently verified by an administrator.'));
      if (!inspection.rejected?.length) { setBulk(''); setSourceName(''); }
      setVerified(false); setSourceChecked(false);
      if (chooser.current) chooser.current.value = '';
    } catch (cause) {
      setError('Import failed: ' + errorMessage(cause) + ' Your JSON has been kept so you can correct or retry it.');
    } finally { working.current = false; setBusy(false); setProgress(''); }
  };

  return <section className="edx-exam-card edx-exam-form edx-importer" aria-labelledby="edx-import-title">
    <div className="edx-import-head"><div><h3 id="edx-import-title">Bulk import MCQs</h3>
      <p>Upload one JSON file or paste a JSON array. Large imports are saved in batches of 100 questions. Set a subject, Quiz set and exam category for the whole batch, or preserve each question’s existing values. Multiple Quiz sets can be included in one JSON file.</p>
      <p style={{marginTop:8,padding:"8px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:13}}><strong>Need to delete a complete uploaded file?</strong> Go to the <strong>Manage MCQs</strong> tab above → select the subject → use the red <strong>"Delete complete file — all listed questions"</strong> section (works even for older imports with no grouped upload).</p></div>
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
        ref={jsonEditor} value={bulk} disabled={busy} onChange={(event) => { setBulk(event.target.value); setSourceName(''); setError(''); setSuccess(''); setVerified(false); setDestination(null); }}
        placeholder={sample}/>
      {sourceName && <p className="edx-import-note">Filename suggestion: {suggestImportMetadata(sourceName, inspection.items || []).subject || 'subject not found'} · {suggestImportMetadata(sourceName, inspection.items || []).category}. You can change the fields above.</p>}
      {inspection.rejected?.length > 0 && <div className="edx-exam-alert" role="alert"><strong>{inspection.rejected.length} questions need review and will not be uploaded.</strong><details open><summary>Show question numbers, JSON lines and errors</summary><ol>{inspection.rejected.map((issue,i) => <li key={i} style={{marginTop:8}}>Question {issue.number}{issue.id != null ? ' (ID '+issue.id+')' : ''}{locations[issue.number - 1] ? ', line '+locations[issue.number - 1].line : ''}: {issue.reason} {locations[issue.number - 1] && <button type="button" className="edx-exam-secondary" onClick={() => goToQuestion(issue.number)} aria-label={'Find question '+issue.number+' in JSON'}>Find in JSON</button>}</li>)}</ol></details><p>Correct the highlighted question in the JSON text or original file, then reselect the updated file. Invalid questions are skipped; original options and answer keys are never invented.</p></div>}
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
      {progress && <p role="status" className="edx-import-note">{progress}</p>}
      {error && <div className="edx-exam-alert edx-import-result" role="alert">{error}</div>}
      {success && <div className="edx-exam-success edx-import-result" role="status"><CheckCircle2 size={18}/>{success}
        {destination?.subject && destination?.category && <a className="edx-exam-secondary" href={'/?page=exam-prep&subject=' + encodeURIComponent(destination.subject) + '&term=' + encodeURIComponent(destination.category)} rel="noopener noreferrer">Open public {destination.subject} {destination.category}</a>}
        {destination?.subject && destination?.category && <button type="button" className="edx-exam-secondary"
          onClick={() => onView?.(destination.subject, destination.category)}>View {destination.subject} {destination.category === 'quiz' ? 'Quiz' : destination.category === 'midterm' ? 'Midterm' : 'Finalterm'}</button>}</div>}
      <button type="submit" className="edx-exam-primary edx-import-submit" disabled={busy || !inspection.items?.length || (sourceChecked && verificationSource.trim().length < 12) || (sourceChecked && mustVerify && !verified)}>
        <UploadCloud size={17}/>{busy ? 'Publishing questions…' : inspection.summary ? 'Import ' + inspection.summary.count + ' questions' : 'Import questions'}
      </button>
      <p className="edx-import-note">The existing Firestore collection is retained. Questions with missing options, missing answer keys or mismatched correct answers are listed for review and skipped. No original files or existing MCQs are deleted.</p>
    </form>
  </section>;
}
