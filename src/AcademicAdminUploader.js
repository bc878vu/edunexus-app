import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, CloudUpload, FileText, ShieldCheck, X } from 'lucide-react';
import { db } from './firebase-client';
import { adminPanelAccess } from './adminSession';
import { uploadToSignedObject } from './signedObjectUpload';
import { validateAcademicFileHeader } from './academic-upload-validation.mjs';

const FILES = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'files');
const SUPABASE_PROJECT = 'cprpndovdfnkvekewstv';
const BUCKET = 'edunexus-public-files';
const MAX_BYTES = 45 * 1024 * 1024; // free-plan bucket limit: 45 MiB
const TYPES = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp'
};
const extension = (name) => String(name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || '';
const safeName = (name) => String(name || 'resource').normalize('NFKD')
  .replace(/[^A-Za-z0-9._-]/g, '_').slice(-105);
const readableSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MiB';
const publicUrl = (path) => 'https://' + SUPABASE_PROJECT + '.supabase.co/storage/v1/object/public/' +
  BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
const allowedMime = (file) => TYPES[extension(file?.name)];
const validFile = (file) => {
  if (!file) return 'Choose a resource file first.';
  if (!allowedMime(file)) return 'Supported types: PDF, Office documents, TXT, CSV, JPG, PNG and WEBP.';
  if (file.size < 1) return 'The selected file is empty.';
  if (file.size > MAX_BYTES) return 'Free Supabase uploads are limited to 45 MiB. For larger files, add a Google Drive link below.';
  return '';
};

async function signUpload(user, file) {
  const idToken = await user.getIdToken(true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('https://' + SUPABASE_PROJECT + '.supabase.co/functions/v1/edunexus-sign-upload', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + idToken, 'content-type': 'application/json' },
      // Browser MIME detection varies (especially for Office files); the server validates the extension.
      // Send the canonical allowlisted MIME type used for the actual multipart file part.
      body: JSON.stringify({ filename: file.name, size: file.size, contentType: allowedMime(file) }),
      signal: controller.signal
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Upload authorization failed (HTTP ' + response.status + ').');
    const signedDestination = String(json.uploadUrl || '');
    let target;
    try { target = new URL(signedDestination); } catch (_) { throw new Error('Storage authorization returned an invalid upload URL.'); }
    if (!json.path || json.bucket !== BUCKET ||
        target.origin !== 'https://' + SUPABASE_PROJECT + '.supabase.co' ||
        !target.pathname.startsWith('/storage/v1/object/upload/sign/' + BUCKET + '/') ||
        !target.searchParams.has('token')) {
      throw new Error('Storage authorization returned an unexpected destination.');
    }
    return json;
  } finally { clearTimeout(timeout); }
}


export default function AcademicAdminUploader({ user, subjects = [], initialSubject = '', onUploaded, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(initialSubject || 'CS101');
  const [customFolder, setCustomFolder] = useState(false);
  const [description, setDescription] = useState('');
  const [rightsBasis, setRightsBasis] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const taskRef = useRef(null);
  const fileInput = useRef(null);
  const inputId = React.useId();
  const busy = phase === 'authorizing' || phase === 'uploading' || phase === 'saving';
  const folders = useMemo(() => [...new Set(['General', 'CS101', ...subjects, ...(initialSubject ? [initialSubject] : [])]
    .filter((name) => typeof name === 'string' && name.trim()))].sort((a, b) => a.localeCompare(b)), [subjects, initialSubject]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (taskRef.current) taskRef.current.abort();
    };
  }, []);
  useEffect(() => {
    if (initialSubject && !busy) { setSubject(initialSubject); setCustomFolder(false); }
  }, [initialSubject, busy]);

  const choose = (next) => {
    if (busy) return;
    setError(''); setNotice('');
    const invalid = validFile(next);
    if (invalid) { setFile(null); setError(invalid); return; }
    setFile(next); setTitle(next.name.replace(/\.[^.]+$/, '').slice(0, 150)); setProgress(0);
    // Prefer an already-existing course folder when it matches the filename,
    // avoiding an accidental CS101 folder for a CS620 paper.
    const detected = next.name.match(/\b[A-Z]{2,5}[0-9]{3}[A-Z]?\b/i)?.[0];
    const suggestedFolder = detected && folders.find((name) => name.toUpperCase() === detected.toUpperCase());
    if (suggestedFolder && !customFolder) setSubject(suggestedFolder);
  };
  const cancel = () => {
    if (taskRef.current) taskRef.current.abort();
  };
  const upload = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    const invalid = validFile(file);
    const code = subject.trim().replace(/\s+/g, ' ');
    if (invalid || !code || code.length > 120 || !title.trim() || title.trim().length > 150 || !rightsConfirmed || !rightsBasis) {
      setError(invalid || 'A folder, title, valid sharing-rights basis and copyright confirmation are required.'); return;
    }
    if (!adminPanelAccess(user)) {
      setError('Sign in as the email-verified EduNexus administrator.'); return;
    }
    inFlight.current = true; setError(''); setNotice(''); setPhase('authorizing'); setProgress(0);
    let uploadedPath = '';
    try {
      const signatureIssue = await validateAcademicFileHeader(file);
      if (signatureIssue) throw new Error(signatureIssue);
      const signed = await signUpload(user, file);
      if (!mounted.current) throw new Error('Page closed.');
      setPhase('uploading');
      await uploadToSignedObject(file, signed, (n) => { if (mounted.current) setProgress(n); },
        (request) => { taskRef.current = request; });
      taskRef.current = null;
      uploadedPath = signed.path;
      setPhase('saving');
      const url = publicUrl(signed.path);
      // Keep all old records and Firebase user data. This adds one new record
      // to the same collection consumed by Academic Hub and Admin Panel.
      await addDoc(FILES, {
        name: title.trim(), subject: code, description: description.trim().slice(0, 1000),
        url, ext: extension(file.name), originalFilename: safeName(file.name),
        storagePath: signed.path, sourceType: 'supabase-storage',
        storageBucket: BUCKET, isLinkOnly: false, size: file.size,
        uploadedBy: 'Admin', rightsBasis, rightsConfirmed: true, rightsConfirmedAt: serverTimestamp(), createdAt: serverTimestamp()
      });
      if (mounted.current) {
        setPhase('done'); setFile(null); setTitle(''); setDescription(''); setRightsBasis(''); setRightsConfirmed(false);
        if (fileInput.current) fileInput.current.value = '';
        setNotice('File uploaded to free Supabase Storage and published in the existing EduNexus library.');
        if (onUploaded) onUploaded(code);
      }
    } catch (failure) {
      if (mounted.current) {
        setPhase('idle');
        setError(uploadedPath
          ? 'File bytes were uploaded, but the Firebase library record was not saved. Do not upload the same file again yet. Your stored file is available at: ' + publicUrl(uploadedPath) + '. Error: ' + (failure?.message || 'Firestore publishing failed.')
          : (failure?.name === 'AbortError' ? 'Authorization timed out. ' : '') +
            (failure?.message || 'Upload failed. Verify your connection and retry.'));
      }
    } finally { inFlight.current = false; taskRef.current = null; }
  };

  return <section className="ah-admin-uploader" aria-label="Academic Hub hybrid file upload">
    <div className="ah-between ah-admin-uploader-head">
      <div><span className="ah-eyebrow"><ShieldCheck size={14}/> Administrator workspace · Free hybrid storage</span>
        <h3>Upload study material directly</h3>
        <p>Upload PDFs and documents to Supabase Free. For files over 45 MiB, use Google Drive through the existing external-resource link form.</p>
      </div>
      <button type="button" className="ah-secondary" aria-expanded={open} onClick={() => !busy && setOpen((v) => !v)}>
        <CloudUpload size={17}/>{open ? 'Hide upload form' : 'Upload file'}
      </button>
    </div>
    {open && <form className="ah-upload-form" onSubmit={upload}>
      <div className={'ah-dropzone' + (dragging ? ' is-dragging' : '')}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) choose(e.dataTransfer.files[0]); }}>
        <CloudUpload size={34}/>
        <strong>{file ? file.name : 'Choose or drop a file'}</strong>
        <p>{file ? readableSize(file.size) + ' · ' + extension(file.name).toUpperCase() : 'Supported documents and images · 45 MiB maximum on Free'}</p>
        <input ref={fileInput} type="file" id={inputId + '-file'} disabled={busy}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp"
          className="ah-visually-hidden" onChange={(e) => choose(e.target.files[0])}/>
        <label className="ah-secondary" htmlFor={inputId + '-file'}>Browse files</label>
      </div>
      <div className="ah-upload-grid">
        <label>Resource title <input required maxLength={150} disabled={busy} value={title}
          onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CS620 Midterm Notes"/></label>
        <label>Subject or folder
          <select required disabled={busy} value={customFolder ? '__custom__' : subject} onChange={(e) => {
            if (e.target.value === '__custom__') { setCustomFolder(true); setSubject(''); }
            else { setCustomFolder(false); setSubject(e.target.value); }
          }}>
            {folders.map((name) => <option key={name} value={name}>{name}</option>)}
            <option value="__custom__">+ Create a new folder…</option>
          </select>
          {customFolder && <input required maxLength={120} disabled={busy} value={subject}
            onChange={(e) => setSubject(e.target.value)} placeholder="New folder name" aria-label="New folder name"/>}
          <span className="ah-note">{folders.length} existing folders · Your existing categories are preserved.</span>
        </label>
        <label className="ah-upload-description">Description (optional)
          <textarea rows={3} maxLength={1000} disabled={busy} value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="Topics covered and how this file helps students."/>
        </label>
        <label className="ah-upload-description">Your legal basis for sharing this file
          <select required disabled={busy} value={rightsBasis} onChange={(e) => setRightsBasis(e.target.value)}>
            <option value="">Select a verified basis…</option>
            <option value="original-work">I created this material and hold sharing rights</option>
            <option value="written-permission">The copyright owner gave explicit permission</option>
            <option value="open-license">An open licence permits redistribution under its terms</option>
            <option value="public-domain">I checked that this work is in the public domain</option>
          </select>
        </label>
        <label className="ah-upload-description" style={{display:'flex',gap:10,alignItems:'flex-start'}}>
          <input type="checkbox" style={{width:'auto',marginTop:5}} required disabled={busy} checked={rightsConfirmed} onChange={(e)=>setRightsConfirmed(e.target.checked)}/>
          <span>I have checked the actual sharing rights for this exact document. I will not upload private or confidential exam material. This declaration records my assessment, not an independent legal verification.</span>
        </label>
      </div>
      {busy && <div role="status" className="ah-upload-progress">
        <div className="ah-between"><span>{phase === 'authorizing' ? 'Verifying secure administrator upload…' :
          phase === 'saving' ? 'Publishing to Academic Hub…' : 'Uploading to Supabase Free…'}</span>
          <strong>{progress}%</strong></div><progress max="100" value={progress} aria-label="Upload progress"/>
      </div>}
      {error && <p className="ah-message ah-upload-error" role="alert">{error}</p>}
      {notice && <p className="ah-message ah-upload-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
      <div className="ah-actions">
        <button type="submit" className="ah-primary" disabled={busy || !file || !rightsBasis || !rightsConfirmed}><CloudUpload size={16}/>{busy ? 'Uploading…' : 'Upload & publish file'}</button>
        {phase === 'uploading' && <button type="button" className="ah-secondary" onClick={cancel}><X size={15}/>Cancel upload</button>}
      </div>
      <p className="ah-note"><FileText size={14}/> Firebase Authentication and all existing Firestore files remain unchanged. The free Supabase bucket is for public study resources only. Use Google Drive for larger files.</p>
    </form>}
  </section>;
}
