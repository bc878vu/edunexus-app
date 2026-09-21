import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { CheckCircle2, CloudUpload, FileText, ShieldCheck, X } from 'lucide-react';
import { db, storage } from './firebase-client';

const FILES = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'files');
const MAX_BYTES = 100 * 1024 * 1024; // Must match the dedicated academic-hub Storage rule.
const ALLOWED = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'webp']);
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
const extension = (name) => String(name || '').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
const normalizedName = (name) => String(name || 'resource')
  .replace(/[\\/:*?"<>|]/g, '_')
  .split('').map((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126 ? c : '_')
  .join('').slice(0, 110);
const readableSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
const validate = (file) => {
  if (!file) return 'Select a file to upload.';
  if (!ALLOWED.has(extension(file.name))) return 'Unsupported format. Choose a PDF, Office document, text file or JPG/PNG/WEBP image.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_BYTES) return 'This file exceeds the 100 MiB upload limit. For larger material, use a shareable Google Drive link.';
  return '';
};

export default function AcademicAdminUploader({ user, subjects, initialSubject = '', onUploaded, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(initialSubject || 'General');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const taskRef = useRef(null);
  const mounted = useRef(true);
  const fileInput = useRef(null);
  const listId = React.useId();
  const busy = phase === 'uploading' || phase === 'saving';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (taskRef.current && taskRef.current.snapshot.state === 'running') taskRef.current.cancel();
    };
  }, []);
  useEffect(() => { if (initialSubject) setSubject(initialSubject); }, [initialSubject]);

  const pick = (next) => {
    setError(''); setNotice('');
    const message = validate(next);
    if (message) { setFile(null); setError(message); return; }
    setFile(next);
    setTitle(next.name.replace(/\.[^.]+$/, '').slice(0, 120));
    setProgress(0);
    setPhase('idle');
  };
  const upload = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError(''); setNotice('');
    const problem = validate(file);
    const code = subject.trim().replace(/\s+/g, ' ');
    if (problem || !code || code.length > 40 || !title.trim() || title.trim().length > 150) {
      setError(problem || 'Provide a subject code and a resource title of 1–150 characters.');
      return;
    }
    if (!user || user.email !== 'veducator4@gmail.com' || !user.emailVerified) {
      setError('Sign in with the verified administrator account to upload files.');
      return;
    }
    const ext = extension(file.name);
    const filename = normalizedName(file.name);
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
    const path = 'academic-hub/' + user.uid + '/' + uniqueId + '/' + filename;
    const target = ref(storage, path);
    const task = uploadBytesResumable(target, file, {
      contentType: TYPES[ext],
      contentDisposition: 'attachment; filename="' + filename.replace(/"/g, '') + '"',
      customMetadata: { uploadedBy: user.uid, subject: code }
    });
    taskRef.current = task;
    setPhase('uploading'); setProgress(0);
    let uploaded = false;
    let published = false;
    try {
      await new Promise((resolve, reject) => task.on('state_changed',
        (snapshot) => { if (mounted.current) setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)); },
        reject, resolve));
      uploaded = true;
      if (mounted.current) setPhase('saving');
      const url = await getDownloadURL(target);
      await addDoc(FILES, {
        name: title.trim(), subject: code, description: description.trim().slice(0, 1000),
        url, ext, originalFilename: filename, storagePath: path,
        sourceType: 'firebase-storage', isLinkOnly: false, size: file.size,
        uploadedBy: 'Admin', createdAt: serverTimestamp()
      });
      published = true;
      if (mounted.current) {
        setPhase('done'); setFile(null); setTitle(''); setDescription('');
        setProgress(100);
        if (fileInput.current) fileInput.current.value = '';
        setNotice('Upload complete. Your file is now listed in the Academic Hub and available to download.');
      }
      if (mounted.current && onUploaded) onUploaded(code);
    } catch (err) {
      // Only clean up THIS newly-created object if its database record was not saved.
      // Existing files and previous uploads are never touched.
      if (uploaded && !published) {
        try { await deleteObject(target); } catch (_) { /* Retain diagnostic if cleanup fails. */ }
      }
      if (mounted.current) {
        setPhase('idle');
        setError(err?.code === 'storage/unauthorized' || err?.code === 'permission-denied'
          ? 'Upload was denied. Verify your administrator account and publish the updated academic-hub Firebase Storage rules. Vercel does not deploy Firebase rules.'
          : err?.code === 'storage/canceled' ? 'Upload cancelled.'
            : 'Upload failed: ' + (err?.message || 'Please retry.'));
      }
    } finally { if (taskRef.current === task) taskRef.current = null; }
  };

  const cancel = () => {
    if (phase === 'uploading' && taskRef.current) taskRef.current.cancel();
  };
  return <section className="ah-admin-uploader" aria-label="Academic Hub direct file upload">
    <div className="ah-between ah-admin-uploader-head">
      <div><span className="ah-eyebrow"><ShieldCheck size={14} /> Administrator workspace</span><h3>Upload a resource directly</h3><p>Upload PDFs, handouts and course files up to 100 MiB. Track progress, cancel a transfer and publish to the existing Academic Hub in one place.</p></div>
      <button type="button" className="ah-secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}><CloudUpload size={18} /> {open ? 'Hide upload form' : 'Upload file'}</button>
    </div>
    {open && <form className="ah-upload-form" onSubmit={upload}>
      <div className={'ah-dropzone' + (dragging ? ' is-dragging' : '')}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy && e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); }}>
        <CloudUpload size={35} /><strong>{file ? file.name : 'Choose or drop a resource file'}</strong>
        <p>{file ? readableSize(file.size) + ' · ' + extension(file.name).toUpperCase() : 'PDF, Office, TXT, CSV or image · up to 100 MiB · resumable upload'}</p>
        <input ref={fileInput} id={listId + '-input'} type="file" disabled={busy} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={(e) => pick(e.target.files[0])} className="ah-visually-hidden" />
        <label className="ah-secondary" htmlFor={listId + '-input'}>Browse files</label>
      </div>
      <div className="ah-upload-grid">
        <label>Resource title <input required maxLength={150} disabled={busy} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CS201 lecture notes — unit 1" /></label>
        <label>Subject or folder <input required maxLength={40} disabled={busy} list={listId} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. CS201" /><datalist id={listId}>{[...new Set(['General', ...subjects])].map((code) => <option value={code} key={code} />)}</datalist></label>
        <label className="ah-upload-description">Description (optional) <textarea rows={3} maxLength={1000} disabled={busy} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the topics covered so students can decide whether this resource is useful." /></label>
      </div>
      {busy && <div role="status" className="ah-upload-progress"><div className="ah-between"><span>{phase === 'saving' ? 'Publishing resource metadata…' : 'Uploading to Firebase Storage…'}</span><strong>{progress}%</strong></div><progress max="100" value={progress} aria-label="File upload progress" /></div>}
      {error && <p className="ah-message ah-upload-error" role="alert">{error}</p>}
      {notice && <p className="ah-message ah-upload-success" role="status"><CheckCircle2 size={17} /> {notice}</p>}
      <div className="ah-actions"><button type="submit" className="ah-primary" disabled={busy || !file}><CloudUpload size={17} /> {busy ? 'Uploading…' : 'Upload & publish file'}</button>{phase === 'uploading' && <button type="button" className="ah-secondary" onClick={cancel}><X size={15} /> Cancel upload</button>}</div>
      <p className="ah-note"><FileText size={14} /> The existing admin upload panel and its Cloudinary/Drive links remain available. Direct uploads here use the Firebase project configured for EduNexus. Only upload material you have permission to share publicly.</p>
    </form>}
  </section>;
}
