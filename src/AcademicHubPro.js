import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, BookOpen, Download, ExternalLink, FileArchive, FileText, FolderOpen, GraduationCap, Search, ShieldCheck, Star, X } from 'lucide-react';
import { db, storage } from './firebase-client';
import { getBlob, ref as storageRef } from 'firebase/storage';
import './academic-hub-pro.css';
import './academic-hub-v2.css';
import { countWords, reviewQualityMessage } from './reviewQuality';
import { trustedPreviewUrl, previewSandbox } from './academic-preview.mjs';
import { routeParamsFromPath } from './app-routes.mjs';
import { useConfirm } from './ConfirmDialog';
const AcademicAdminUploader = React.lazy(() => import('./AcademicAdminUploader'));

const BASE = ['artifacts', 'edunexus-live', 'public', 'data'];
const FILES = collection(db, ...BASE, 'files');
const FOLDERS = doc(db, ...BASE, 'meta', 'folders');
const DEFAULT_SUBJECTS = ['PHY101', 'CS101', 'MGT101', 'ENG101', 'CS201', 'MTH101', 'ISL201', 'PAK301'];
const EDITORIAL_GUIDES = [
  ['CS101','CS101: Computing fundamentals','cs101-from-bits-to-programs-a-practical-study-guide'],
  ['CS201','CS201: Programming examples','cs201-variables-functions-and-program-tracing'],
  ['CS620','CS620: Models and simulation','cs620-models-randomness-and-simulation-experiments'],
  ['HRM613','HRM613: Performance management','hrm613-goals-feedback-and-fair-performance-evaluation'],
  ['PHY101','PHY101: Motion and forces','phy101-motion-forces-and-units-worked-through'],
  ['MTH101','MTH101: Calculus worked examples','mth101-limits-derivatives-and-interpreting-change']
];
const PAGE_SIZE = 60;
const cut = (v, n = 300) => String(v == null ? '' : v).trim().slice(0, n);
// Display-only: zero-width space after each underscore gives the browser clean
// wrap points, so folder names break at word boundaries (never mid-word).
// The raw code value is untouched — keys, navigation and queries are unaffected.
const displayFolderName = (code) => String(code || '').replace(/_/g, '_\u200b');
const safeHttp = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const u = new URL(String(raw || ''), window.location.href);
    return u.protocol === 'https:' || (u.origin === window.location.origin && u.protocol === 'http:') ? u : null;
  } catch (_) { return null; }
};
const nameOf = (f) => cut(f.name || f.title || 'Untitled resource', 170);
const filePublicPath = (f) => '/vu-notes/file/' + encodeURIComponent(f.id) + '/' +
  (String(f.name || f.title || 'study-resource').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'study-resource');
const extOf = (f) => {
  const explicit = cut(f.ext, 10).replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (explicit && explicit !== 'LINK') return explicit;
  const part = (f.name || '').match(/\.([a-z0-9]{2,6})$/i);
  const url = safeHttp(f.url);
  const fromPath = url && url.pathname.match(/\.([a-z0-9]{2,6})$/i);
  return (part ? part[1] : fromPath ? fromPath[1] : 'LINK').toUpperCase();
};
const dateOf = (f) => {
  try { return f.createdAt && typeof f.createdAt.toDate === 'function' ? f.createdAt.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''; }
  catch (_) { return ''; }
};
const driveId = (url) => {
  if (!url || !/^(drive|docs)\.google\.com$/i.test(url.hostname)) return '';
  const match = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url.searchParams.get('id') || '';
};
const fileLinks = (f) => {
  const url = safeHttp(f.url || f.downloadUrl || f.fileUrl);
  if (!url) return { source: '', download: '', preview: '', kind: 'unavailable', direct: false };
  const source = url.href;
  // Supabase public study files can preview inline, while ?download requests a
  // downloadable response. Existing Firebase, Drive and Cloudinary links stay intact.
  if (f.sourceType === 'supabase-storage' && f.storageBucket === 'edunexus-public-files') {
    const ext = extOf(f);
    const preview = ['PDF', 'PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? source : '';
    return { source, preview, download: '/api/resource-download?id=' + encodeURIComponent(f.id), kind: ext === 'PDF' ? 'pdf' :
      ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? 'image' : 'external', direct: false };
  }
  // New Firebase uploads have attachment disposition: clicking their URL downloads.
  // Their inline PDF/image preview is retrieved separately through the Storage SDK.
  if (f.sourceType === 'firebase-storage' && f.storagePath) {
    return { source, download: source, preview: '', kind: 'firebase', direct: true };
  }
  const id = driveId(url);
  const isDriveFolder = /^(drive|docs)\.google\.com$/i.test(url.hostname) && /\/folders\//.test(url.pathname);
  if (id && !isDriveFolder) {
    const isDocs = url.hostname === 'docs.google.com';
    const kind = isDocs && /\/document\//.test(url.pathname) ? 'document'
      : isDocs && /\/spreadsheets\//.test(url.pathname) ? 'spreadsheet'
      : isDocs && /\/presentation\//.test(url.pathname) ? 'presentation' : 'drive';
    const preview = kind === 'drive' ? 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview'
      : kind === 'document' ? 'https://docs.google.com/document/d/' + encodeURIComponent(id) + '/preview'
      : kind === 'spreadsheet' ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/preview'
      : 'https://docs.google.com/presentation/d/' + encodeURIComponent(id) + '/preview';
    const download = kind === 'document' ? 'https://docs.google.com/document/d/' + encodeURIComponent(id) + '/export?format=pdf'
      : kind === 'spreadsheet' ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/export?format=xlsx'
      : kind === 'presentation' ? 'https://docs.google.com/presentation/d/' + encodeURIComponent(id) + '/export/pdf'
      : 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
    return { source, preview, download, kind, direct: true };
  }
  if (isDriveFolder) return { source, preview: '', download: source, kind: 'folder', direct: false };
  const ext = extOf(f);
  const image = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(ext);
  const pdf = ext === 'PDF';
  if (url.hostname.endsWith('.cloudinary.com') && /^res\.cloudinary\.com$/i.test(url.hostname) && /\/(?:image|raw|video|auto)\/upload\//.test(url.pathname)) {
    const download = source.replace(/\/(image|raw|video|auto)\/upload\//, '/$1/upload/fl_attachment/');
    return { source, preview: image || pdf ? source : '', download, kind: image ? 'image' : pdf ? 'pdf' : 'file', direct: true };
  }
  return { source, preview: image || pdf ? source : '', download: source, kind: image ? 'image' : pdf ? 'pdf' : f.isLinkOnly && ext === 'LINK' ? 'external-link' : 'external', direct: url.origin === window.location.origin };
};
const safeFileName = (f) => {
  const base = String(f.originalFilename || nameOf(f)).replace(/[\\/:*?"<>|]/g, '_').split('').filter((ch) => ch.charCodeAt(0) >= 32).join('').slice(0, 120);
  const ext = extOf(f).toLowerCase();
  return ext && ext !== 'link' && !base.toLowerCase().endsWith('.' + ext) ? base + '.' + ext : base;
};
const REVIEWS = (id) => collection(db, ...BASE, 'files', id, 'reviews');
const reviewDoc = (id, uid) => doc(db, ...BASE, 'files', id, 'reviews', uid);
const reviewIsAdmin = (user, isAdmin) => Boolean(isAdmin && user && user.email === 'veducator4@gmail.com' && user.emailVerified);

// Denormalized rating summary stored as fields on the file document itself.
// The public catalogue query already loads every file document, so reading
// ratingAverage/ratingCount costs zero extra reads (previously one
// getAggregateFromServer query ran per visible card). FileCardRating reads
// these fields first and keeps the live aggregation as the fallback while
// they are absent. The summary is refreshed best-effort after every review
// write below; permission-denied is tolerated silently because the current
// Firestore rules only let the verified admin update file documents.
const fileRatingDoc = (id) => doc(db, ...BASE, 'files', id);
const readRatingSummary = (data) => {
  const value = Number(data?.ratingAverage);
  const total = Number(data?.ratingCount);
  return Number.isFinite(value) && Number.isInteger(total) && total > 0 ? value : null;
};
const refreshFileRatingSummary = async (fileId) => {
  try {
    const snap = await getDocs(query(REVIEWS(fileId), where('status', '==', 'approved'), limit(100)));
    let sum = 0, total = 0;
    snap.forEach((d) => {
      const r = Number(d.data()?.rating);
      if (Number.isFinite(r) && r >= 1 && r <= 5) { sum += r; total++; }
    });
    const value = total > 0 ? sum / total : null;
    await setDoc(fileRatingDoc(fileId), {
      ratingAverage: total > 0 && Number.isFinite(value) ? value : null,
      ratingCount: total,
      ratingSummaryUpdatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (_) {
    return false;
  }
};

// Verify fetched bytes are genuinely a PDF before they are framed without a
// sandbox. A blob: URL inherits our origin, so only real PDFs (checked via the
// %PDF- magic bytes) may use the unsandboxed viewer path; anything else falls
// back to the download link.
function verifyPdfBlob(blob) {
  if (!blob || blob.size > 20 * 1024 * 1024) return Promise.reject(new Error('preview pdf too large'));
  return blob.slice(0, 5).text().then((head) => {
    if (head !== '%PDF-') throw new Error('preview is not a pdf');
    return blob;
  });
}

function ResourcePreview({ file, links, onClose }) {
  const ext = extOf(file);
  const isImage = links.kind === 'image' || (links.kind === 'firebase' && ['JPG','JPEG','PNG','WEBP'].includes(ext));
  const supportedFirebase = links.kind === 'firebase' && (isImage || ext === 'PDF')
    && (!Number.isFinite(file.size) || file.size <= 20 * 1024 * 1024);
  // Direct-URL PDFs (Supabase/Cloudinary) are fetched as same-origin blobs:
  // Chrome's built-in PDF viewer is blocked in sandboxed cross-origin frames,
  // so we serve the bytes through a blob: URL like the Firebase flow instead
  // of framing the cross-origin storage URL directly.
  const directPdfUrl = links.kind === 'pdf' && ext === 'PDF' ? trustedPreviewUrl(links, links.preview, '') : '';
  const supportedDirectPdf = Boolean(directPdfUrl)
    && (!Number.isFinite(file.size) || file.size <= 20 * 1024 * 1024);
  const [localUrl, setLocalUrl] = useState('');
  const [state, setState] = useState('idle');
  useEffect(() => {
    let loadBlob = null;
    if (supportedFirebase && file.storagePath) {
      loadBlob = getBlob(storageRef(storage, file.storagePath), 20 * 1024 * 1024).then(verifyPdfBlob);
    } else if (supportedDirectPdf && directPdfUrl) {
      loadBlob = fetch(directPdfUrl, { mode: 'cors' }).then((res) => {
        if (!res.ok) throw new Error('preview fetch failed: ' + res.status);
        const ctype = res.headers.get('content-type') || '';
        if (!/pdf/i.test(ctype)) throw new Error('preview is not a pdf');
        const len = parseInt(res.headers.get('content-length') || '0', 10);
        if (len > 20 * 1024 * 1024) throw new Error('preview pdf too large');
        return res.blob();
      }).then(verifyPdfBlob);
    }
    if (!loadBlob) { setLocalUrl(''); setState('idle'); return; }
    let alive = true;
    let objectUrl = '';
    setLocalUrl(''); setState('loading');
    loadBlob.then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalUrl(objectUrl); setState('ready');
    }).catch(() => {
      if (alive) setState('error');
    });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.storagePath, supportedFirebase, supportedDirectPdf, directPdfUrl]);
  const displayUrl = localUrl || links.preview;
  const frameUrl = trustedPreviewUrl(links, links.preview, localUrl);
  // Until a direct PDF's blob is ready — or if it can't be fetched — keep the
  // blocked cross-origin URL out of the iframe and show the loading/download
  // message instead.
  const directPdfBlocked = links.kind === 'pdf' && ext === 'PDF' && !/^blob:/.test(localUrl || '');
  const canEmbed = Boolean(isImage ? displayUrl : frameUrl) && !directPdfBlocked;
  // Chrome's built-in PDF viewer is blocked inside ANY sandboxed iframe —
  // verified live: sandbox="allow-scripts allow-same-origin" still shows "This
  // page has been blocked by Chromium" for both direct and blob: URLs, while
  // the same URLs render fine with no sandbox attribute. Verified PDF blobs
  // (bytes we fetched from an allowlisted host and checked for the %PDF-
  // signature) therefore render without the sandbox attribute. Every other
  // preview kind keeps the sandbox.
  const isVerifiedPdfBlob = ext === 'PDF' && /^blob:/.test(frameUrl || '');
  return <section className="ah-focus" aria-label="Resource preview">
    <div className="ah-between"><div><span className="ah-eyebrow">In-page preview</span><h3>{nameOf(file)}</h3></div><button type="button" className="ah-icon-button" onClick={onClose} aria-label="Close preview"><X size={19} /></button></div>
    {state === 'loading' && <div className="ah-loading" role="status"><div /><p>Preparing a secure in-page preview…</p></div>}
    {canEmbed ? (isImage ? <img className="ah-preview-image" loading="lazy" src={displayUrl} alt={nameOf(file)} /> :
      <iframe className="ah-preview-frame" loading="lazy" title={'Preview of ' + nameOf(file)} src={frameUrl} sandbox={isVerifiedPdfBlob ? undefined : previewSandbox(links.kind)} referrerPolicy="no-referrer" />) :
      state !== 'loading' && <div className="ah-empty"><FileText size={26} /><p>{state === 'error' ? 'The file could not be previewed in this browser (possibly because of Storage CORS settings). Its download link remains available.' : 'Only known PDF and document hosts are previewed inside EduNexus. If the viewer cannot load, use the existing Download button to open the original file.'}</p></div>}
    <div className="ah-preview-foot"><span>{ext} · {cut(file.subject, 50) || 'General'}</span></div>
  </section>;
}

function FileReviews({ file, user, isAdmin }) {
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState({});
  const { requestConfirm, ConfirmUI } = useConfirm();
  const [reportResults, setReportResults] = useState({});
  const admin = reviewIsAdmin(user, isAdmin);

  useEffect(() => {
    let alive = true;
    setItems([]); setMine(null); setStatus(''); setLoading(true); setPending([]); setEditing(null);
    const approved = query(REVIEWS(file.id), where('status', '==', 'approved'), limit(100));
    const unsub = onSnapshot(approved, (snap) => {
      if (alive) { setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(r => r.isActive !== false).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))); setLoading(false); }
    }, (error) => { if (alive) { setLoading(false); setStatus(error.code === 'permission-denied' ? 'Review access is denied. The updated Firestore rules must be published.' : 'Reviews could not load. Please check your connection.'); } });
    let ownUnsub = () => {};
    if (user?.uid) ownUnsub = onSnapshot(reviewDoc(file.id, user.uid), (snap) => {
      if (alive) setMine(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, () => {});
    let pendingUnsub = () => {};
    // Only historical pending records need an administrator action. New reviews publish immediately.
    if (admin) pendingUnsub = onSnapshot(query(REVIEWS(file.id), where('status', '==', 'pending'), limit(40)), (snap) => { if (alive) setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); }, () => {});
    return () => { alive = false; unsub(); ownUnsub(); pendingUnsub(); };
  }, [file.id, user?.uid, admin]);

  const publish = async (event) => {
    event.preventDefault();
    const value = comment.trim();
    if (!user?.uid || mine || !Number.isInteger(Number(rating))) return;
    const safetyMessage = reviewQualityMessage(value);
    if (safetyMessage) { setStatus(safetyMessage); return; }
    setBusy(true); setStatus('');
    try {
      await setDoc(reviewDoc(file.id, user.uid), {
        userId: user.uid, rating: Number(rating), comment: value, originalComment: value,
        status: 'approved', createdAt: serverTimestamp()
      });
      const summaryOk = await refreshFileRatingSummary(file.id);
      setComment(''); setStatus(''); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } }));
    } catch (error) {
      // Avoid regressing existing submission behavior if Firebase rules deploy
      // after the Vercel frontend: the old policy accepts only <=800-char drafts.
      if (error.code === 'permission-denied' && value.length <= 800) {
        try {
          await setDoc(reviewDoc(file.id, user.uid), {
            userId: user.uid, rating: Number(rating), comment: value,
            status: 'pending', createdAt: serverTimestamp()
          });
          const pendingSummaryOk = await refreshFileRatingSummary(file.id);
          setComment('');
          window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: pendingSummaryOk } }));
          setStatus('Your review was saved under the existing approval policy. The administrator must deploy the updated Firebase rules to enable instant publication.');
        } catch (_) { setStatus('Review could not be saved. The updated Firebase rules may still need to be published.'); }
      } else {
        setStatus(error.code === 'permission-denied'
          ? 'The updated Firebase review rules must be published before this long review can appear immediately.'
          : 'Review could not be saved. Please try again.');
      }
    }
    finally { setBusy(false); }
  };
  const moderate = async (item) => {
    setBusy(true); setStatus('');
    try { await updateDoc(reviewDoc(file.id, item.id), { status: 'approved', moderatedAt: serverTimestamp() }); const summaryOk = await refreshFileRatingSummary(file.id); setStatus('Earlier pending review published.'); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } })); }
    catch (_) { setStatus('Could not publish this earlier review. Check administrator permissions.'); }
    finally { setBusy(false); }
  };
  const startEdit = (item) => { setEditing(item.id); setEditText(String(item.comment || '')); setEditRating(Number(item.rating || 5)); };
  const saveEdit = async (item) => {
    if (!admin || editText.trim().length < 20 || editText.trim().length > 50000) return;
    setBusy(true); setStatus('');
    try {
      await updateDoc(reviewDoc(file.id, item.id), { comment: editText.trim(), rating: Number(editRating), editedAt: serverTimestamp() });
      const summaryOk = await refreshFileRatingSummary(file.id);
      setEditing(null); setStatus('Review updated by administrator.'); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } }));
    } catch (_) { setStatus('Could not edit the review. Check administrator permissions.'); }
    finally { setBusy(false); }
  };
  const remove = async (item) => {
    if (!admin) return;
    requestConfirm({
      message: 'Permanently delete this resource review?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setBusy(true); setStatus('');
        try { await deleteDoc(reviewDoc(file.id, item.id)); const summaryOk = await refreshFileRatingSummary(file.id); setStatus('Review deleted.'); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } })); }
        catch (_) { setStatus('Review deletion failed.'); }
        finally { setBusy(false); }
      },
    });
  };
  const reportReview = async (review) => {
    if (!user?.uid || review.id === user.uid || busy || reported[review.id]) return;
    const reason = window.prompt('Report reason: spam, abuse, copyright, personal-data, or other', 'spam');
    if (reason === null) return;
    const value = String(reason || '').trim().toLowerCase();
    if (!['spam','abuse','copyright','personal-data','other'].includes(value)) {
      setStatus('Choose a valid report reason: spam, abuse, copyright, personal-data, or other.'); return;
    }
    setBusy(true); setStatus('');
    try {
      await setDoc(doc(db, ...BASE, 'files', file.id, 'reviews', review.id, 'reports', user.uid), {
        reporterUid: user.uid, reason: value, createdAt: serverTimestamp()
      });
      setReported((prev) => ({ ...prev, [review.id]: true }));
      setStatus('Thanks. The review has been reported to the administrator for inspection.');
    } catch (error) {
      setStatus(error.code === 'permission-denied'
        ? 'Reports require the updated Firestore rules. Please use the Contact page until they are published.'
        : 'This report could not be saved. Please try again.');
    } finally { setBusy(false); }
  };
  const inspectReports = async (review) => {
    if (!admin || busy) return;
    setBusy(true); setStatus('');
    try {
      const snapshot = await getDocs(collection(db, ...BASE, 'files', file.id, 'reviews', review.id, 'reports'));
      setReportResults((prev) => ({
        ...prev, [review.id]: snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
      }));
    } catch (_) { setStatus('Review reports could not be loaded. Check deployed Firestore rules.'); }
    finally { setBusy(false); }
  };
  const average = items.length ? (items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length).toFixed(1) : '';
  return <section className="ah-focus" aria-label="Resource reviews">
    <div className="ah-between"><div><span className="ah-eyebrow">Student resource reviews</span><h3>Read and review: {nameOf(file)}</h3></div><span className="ah-chip"><Star size={14} /> {average || 'New'} · {items.length} published</span></div>
    <p>Share your own experience with this study material. User-submitted reviews appear immediately and do not represent an official examination guarantee.</p>
    {status && <div role="status" className="ah-message">{status}</div>}
    {loading ? <p>Loading reviews…</p> : items.length ? <div className="ah-review-list">{items.map((r) => <article className="ah-review" key={r.id}><div className="ah-between"><strong>Student review {r.editedAt ? '· edited by admin' : ''}</strong><span className="ah-stars" aria-label={r.rating + ' out of 5 stars'}>{'★'.repeat(Math.max(0, Math.min(5, r.rating || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, r.rating || 0)))}</span></div><p>{String(r.comment || '')}</p><div className="ah-actions">{user?.uid && user.uid !== r.id && !admin && <button type="button" className="ah-secondary" disabled={busy || reported[r.id]} onClick={() => reportReview(r)}>{reported[r.id] ? 'Reported' : 'Report review'}</button>}{admin && <button type="button" className="ah-secondary" disabled={busy} onClick={() => inspectReports(r)}>Check reports</button>}</div>{admin && reportResults[r.id] && <p className="ah-note" role="status">{reportResults[r.id].length ? reportResults[r.id].length + ' report(s): ' + reportResults[r.id].map((item) => item.reason).join(', ') : 'No reports on this review.'}</p>}{admin && <div className="ah-actions"><button type="button" className="ah-secondary" disabled={busy} onClick={() => startEdit(r)}>Edit</button><button type="button" className="ah-delete" disabled={busy} onClick={() => remove(r)}>Delete</button></div>}{admin && editing === r.id && <div className="ah-review-form"><label>Rating<select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label><label>Review text<textarea rows={6} maxLength={50000} value={editText} onChange={(e) => setEditText(e.target.value)} /></label><div className="ah-actions"><button type="button" className="ah-primary" disabled={busy || editText.trim().length < 20} onClick={() => saveEdit(r)}>Save edit</button><button type="button" className="ah-secondary" onClick={() => setEditing(null)}>Cancel</button></div></div>}</article>)}</div> : <div className="ah-empty">No published reviews yet. Be the first to share thoughtful feedback.</div>}
    {user?.uid ? (mine ? null :
      <form className="ah-review-form" onSubmit={publish}><h4>Share your experience</h4><label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Helpful</option><option value={3}>3 — Average</option><option value={2}>2 — Needs improvement</option><option value={1}>1 — Not helpful</option></select></label><label>Written review<textarea required rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write your review of this file…" /></label><p className="ah-note">Up to 50 words. Reviews publish automatically. Please share genuine feedback, without personal data or active exam content.</p><button type="submit" className="ah-primary" disabled={busy || !comment.trim() || countWords(comment) > 50}>{busy ? 'Publishing…' : 'Publish review'}</button></form>) : <p className="ah-note">Sign in to leave a review.</p>}
    {admin && pending.length > 0 && <div className="ah-review-queue"><h4><ShieldCheck size={17} /> Earlier unpublished reviews ({pending.length})</h4>{pending.map((r) => <article key={r.id} className="ah-review"><strong>{r.rating} / 5 · Student review</strong><p>{String(r.comment || '')}</p><div className="ah-actions"><button type="button" className="ah-primary" disabled={busy} onClick={() => moderate(r)}>Publish earlier review</button><button type="button" className="ah-delete" disabled={busy} onClick={() => remove(r)}>Delete</button></div></article>)}</div>}
    <ConfirmUI />
  </section>;
}

function FileCardRating({ fileId, ratingAverage, ratingCount }) {
  const [score, setScore] = useState(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    // True while the file document carries a fresh denormalized summary, so
    // refreshes can use one cheap document read instead of an aggregation.
    let denormalized = readRatingSummary({ ratingAverage, ratingCount }) !== null;
    if (active) setScore(readRatingSummary({ ratingAverage, ratingCount }));
    const aggregate = async (current) => {
      try {
        // Regular list query (not server aggregation) — the Firestore rules
        // allow public listing of approved reviews, and client-side averaging
        // avoids aggregation permission issues.
        const snap = await getDocs(query(REVIEWS(fileId), where('status', '==', 'approved'), limit(100)));
        let sum = 0, n = 0;
        snap.forEach((d) => {
          const r = Number(d.data()?.rating);
          if (Number.isFinite(r) && r >= 1 && r <= 5) { sum += r; n++; }
        });
        if (active && current === revision) {
          setScore(n > 0 ? sum / n : null);
        }
      } catch (_) { if (active && current === revision) setScore(null); }
    };
    const refresh = async (mode) => {
      const current = ++revision;
      // 'aggregate' skips the summary entirely: a review just changed without
      // a confirmed metadata rewrite, so the summary may be stale. 'summary'
      // is only requested right after such a rewrite, so the document read is
      // trusted. 'auto' uses the summary only while it is believed fresh.
      if (mode === 'aggregate') denormalized = false;
      if (mode !== 'aggregate' && (mode === 'summary' || denormalized)) {
        try {
          const snapshot = await getDoc(fileRatingDoc(fileId));
          const summary = snapshot.exists() ? readRatingSummary(snapshot.data()) : null;
          if (summary !== null) {
            denormalized = true;
            if (active && current === revision) setScore(summary);
            return;
          }
        } catch (_) { /* fall through to the aggregation fallback */ }
        denormalized = false;
      }
      await aggregate(current);
    };
    void refresh('auto');
    const onReviewChange = (event) => {
      if (!event.detail?.fileId || event.detail.fileId === fileId) {
        // A confirmed metadata rewrite means the summary is fresh; any other
        // review change means it is stale, so aggregate instead.
        void refresh(event.detail?.ratingSummaryUpdated === true ? 'summary' : 'aggregate');
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh('auto'); };
    window.addEventListener('edunexus:file-review-changed', onReviewChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.removeEventListener('edunexus:file-review-changed', onReviewChange); document.removeEventListener('visibilitychange', onVisible); };
  }, [fileId, ratingAverage, ratingCount]);
  if (score === null) return null;
  const fullStars = Math.max(0, Math.min(5, Math.round(score)));
  const countLabel = Number(ratingCount) > 0 ? ' (' + Number(ratingCount) + ')' : '';
  return <p className="ah-card-rating" aria-label={'Average student rating ' + score.toFixed(1) + ' out of 5 stars' + (countLabel ? ', based on' + countLabel + ' reviews' : '')}>
    <span className="ah-card-stars" aria-hidden="true">{'★'.repeat(fullStars)}{'☆'.repeat(5 - fullStars)}</span><span>{score.toFixed(1)}{countLabel}</span>
  </p>;
}

function ResourceCard({ file, isAdmin, onDelete, onPreview, onReviews, onDownload, downloadStatus }) {
  const links = fileLinks(file);
  const title = nameOf(file);
  return <article className="ah-resource">
    <div className="ah-file-icon"><FileText size={22} /></div>
    <div className="ah-resource-content"><div className="ah-between ah-file-top"><h3>{title}</h3><span className="ah-chip">{extOf(file)}</span></div>
      <FileCardRating fileId={file.id} ratingAverage={file.ratingAverage} ratingCount={file.ratingCount} />
      <p className="ah-meta">{cut(file.subject, 50) || 'General'}{dateOf(file) ? ' · Added ' + dateOf(file) : ''}</p>
      {file.description && <p className="ah-description">{cut(file.description, 320)}</p>}
      <div className="ah-actions">
        <button type="button" className="ah-secondary" disabled={!links.source} onClick={() => onPreview(file)}><BookOpen size={16} /> Preview</button>
        <button type="button" className="ah-secondary" onClick={() => onReviews(file)}><Star size={16} /> Reviews</button>
        <a className="ah-secondary" href={filePublicPath(file)}>File page</a>
        {links.source ? <a className="ah-primary" href={links.download} download={links.direct ? safeFileName(file) : undefined} target="_blank" rel="noopener noreferrer" onClick={(e) => onDownload(e, file, links)}>{links.kind === "folder" || links.kind === "external-link" ? <ExternalLink size={16} /> : <Download size={16} />}{links.kind === "folder" ? "Open folder" : links.kind === "external-link" ? "Open resource" : "Download"}</a> : <span className="ah-muted">File link unavailable</span>}
        {isAdmin && <button type="button" className="ah-delete" onClick={() => onDelete(file)} aria-label={'Delete ' + title}>Delete</button>}
      </div>
      {downloadStatus && <p className="ah-note" role="status">{downloadStatus}</p>}
    </div>
  </article>;
}

const guidance = [
  { icon: '01', title: 'Build a subject-wise study library', body: 'Start with the course code used in your learning management system and keep lecture notes, handouts, summaries and practice material together. A subject folder provides a predictable place to return to whenever you revise. If a folder currently has no uploaded resources, it remains available so new material can be added without changing how students navigate the library.' },
  { icon: '02', title: 'Read the handouts before attempting practice questions', body: 'Use the course handouts to identify the core definitions, models and worked examples. Turn important headings into short questions and answer them without looking at the source. Compare your response with the handout, correct misunderstandings and repeat the exercise later. This method helps you use downloaded material actively rather than collecting files you never revisit.' },
  { icon: '03', title: 'Combine different resources carefully', body: 'Lecture slides may provide an outline, while reference notes can explain the same idea in more detail. Past-paper reviews and student comments can suggest areas worth revising, but they are not an official syllabus and cannot reliably predict a future examination. Check course announcements and the current handouts when you need authoritative instructions about assessments.' },
  { icon: '04', title: 'Review resources before downloading', body: 'Open the Preview action to inspect a supported document in this page before saving it. Look at its subject code, title, topics, legibility and publication context. If a file looks outdated or unrelated, compare it with the current course material. Student reviews may help you discover useful notes, but their opinions should not replace your own evaluation of a source.' },
  { icon: '05', title: 'Plan small, repeatable revision sessions', body: 'Divide each course into manageable topics and reserve a separate slot for examples, practice and error correction. After a study session, record the topics you can explain independently and the questions that still need attention. Revisit the latter in your next session. A clear sequence of retrieval, feedback and revision is more actionable than one long session of passive reading.' },
  { icon: '06', title: 'Download and organize material responsibly', body: 'Save files under meaningful subject and topic names and avoid creating multiple confusing copies. Check the file type before opening unfamiliar downloads, and keep your browser and document viewer updated. External file hosts may require the uploader to enable sharing or may present a confirmation page for larger downloads. Respect authorship and use resources only where sharing and use are permitted.' },
  { icon: '07', title: 'Contribute constructive resource reviews', body: 'Once you have used a file, describe its clarity, strengths and limitations in a short review. Mention whether examples are understandable and whether material appears aligned with your course. Avoid confidential examination content, spam and private information. Genuine reviews may appear immediately; visitors can report inappropriate submissions for administrator review.' },
  { icon: '08', title: 'Get more from your EduNexus workspace', body: 'Use the Academic Hub for files, the Exam Prep section for curated practice MCQs and completed-paper experiences, and the existing study tools when you need a different way to revise. These features complement one another: a document provides the source, practice checks recall, and your own notes capture what still needs work. There is no need to install a separate browser extension to browse this library.' }
];

export default function AcademicHubPro({ user, isAdmin = false, showToast }) {
  const { requestConfirm, ConfirmUI } = useConfirm();
  const [latest, setLatest] = useState([]);
  const [older, setOlder] = useState([]);
  const [subjectFiles, setSubjectFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderCounts, setFolderCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [format, setFormat] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [subjectsExpanded, setSubjectsExpanded] = useState(true);
  const [subject, setSubject] = useState(() => new URLSearchParams(window.location.search).get('subject') || routeParamsFromPath(window.location.pathname).subject || '');
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('file') || '');
  const [panel, setPanel] = useState(() => new URLSearchParams(window.location.search).get('panel') === 'reviews' ? 'reviews' : 'preview');
  const [downloadStatus, setDownloadStatus] = useState({});
  const [visible, setVisible] = useState(18);
  const scroller = useRef(null);
  const latestCursorRef = useRef(null);
  const olderPagesLoaded = useRef(false);

  useEffect(() => {
    const onPop = () => { const params = new URLSearchParams(window.location.search); setSubject(params.get('subject') || routeParamsFromPath(window.location.pathname).subject || ''); setSelectedId(params.get('file') || ''); setPanel(params.get('panel') === 'reviews' ? 'reviews' : 'preview'); };
    window.addEventListener('popstate', onPop);
    const unsubFiles = onSnapshot(query(FILES, orderBy('createdAt', 'desc'), limit(PAGE_SIZE)), (snap) => {
      setLatest(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // Follow the live first page until older pages have been requested.
      setCursor((prev) => prev && prev.id !== latestCursorRef.current ? prev : (snap.docs[snap.docs.length - 1] || null));
      latestCursorRef.current = snap.docs[snap.docs.length - 1]?.id || null;
      setHasMore((prev) => prev && olderPagesLoaded.current ? prev : snap.docs.length === PAGE_SIZE);
      setLoading(false); setError('');
    }, (e) => { setLoading(false); setError(e.code === 'permission-denied' ? 'The file library is not accessible with the currently deployed Firestore rules.' : 'Could not load files. Please check your connection and try again.'); });
    const unsubFolders = onSnapshot(FOLDERS, (snap) => {
      const data = snap.data() || {};
      setFolders(Array.isArray(data.list) ? data.list.filter((v) => typeof v === 'string') : []);
      setFolderCounts(data.fileCounts && typeof data.fileCounts === 'object' ? data.fileCounts : {});
    }, () => {});
    return () => { unsubFiles(); unsubFolders(); window.removeEventListener('popstate', onPop); };
  }, []);

  // Fast subject view: when a subject folder is opened (e.g.
  // ?page=academic&subject=CS609_System_Programming), load ALL of that
  // subject's files immediately with a single where-query instead of paging
  // through the global newest-first feed. No orderBy here, so no composite
  // index is required; client-side sort happens in the `files` memo below.
  useEffect(() => {
    if (!subject) { setSubjectFiles([]); return; }
    const unsub = onSnapshot(query(FILES, where('subject', '==', subject), limit(200)),
      (snap) => setSubjectFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {});
    return () => unsub();
  }, [subject]);

  const files = useMemo(() => {
    const map = new Map();
    [...older, ...latest, ...subjectFiles].forEach((f) => map.set(f.id, f));
    return [...map.values()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [latest, older, subjectFiles]);
  useEffect(() => {
    if (!selectedId || files.some((f) => f.id === selectedId)) return;
    let alive = true;
    getDoc(doc(FILES, selectedId)).then((snap) => {
      if (alive && snap.exists()) setOlder((prev) => [...prev.filter((f) => f.id !== snap.id), { id: snap.id, ...snap.data() }]);
    }).catch(() => { if (alive) setError('The selected file could not be loaded.'); });
    return () => { alive = false; };
  }, [selectedId, files]);
  const counts = useMemo(() => files.reduce((m, f) => { const key = cut(f.subject, 50); if (key) m[key] = (m[key] || 0) + 1; return m; }, {}), [files]);
  const subjects = useMemo(() => [...new Set([...DEFAULT_SUBJECTS, ...folders, ...Object.keys(counts)].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [folders, counts]);
  const normalized = deferredSearch.trim().toLowerCase();
  const matches = useMemo(() => {
    const result = files.filter((f) => f.isActive !== false
      && (!subject || f.subject === subject)
      && (format === 'all' || (format === 'documents' ? ['PDF','DOC','DOCX','PPT','PPTX','XLS','XLSX','TXT','CSV'].includes(extOf(f)) : format === 'images' ? ['PNG','JPG','JPEG','WEBP'].includes(extOf(f)) : extOf(f) === 'LINK'))
      && (!normalized || [f.name, f.title, f.subject, f.description, f.ext].some((value) => String(value || '').toLowerCase().includes(normalized))));
    if (sortBy === 'name') result.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    else if (sortBy === 'oldest') result.reverse();
    return result;
  }, [files, subject, format, normalized, sortBy]);
  // A selected subject shows its files immediately and completely — no
  // manual "load more" needed. The unfiltered view keeps client-side paging.
  const displayed = subject ? matches : matches.slice(0, visible);
  const selected = files.find((f) => f.id === selectedId);
  useEffect(() => { if (selectedId && scroller.current) scroller.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [selectedId]);
  const openSubject = (value) => {
    setSubject(value); setVisible(18); setSelectedId('');
    if (value) setSubjectsExpanded(false);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('subject', value); else url.searchParams.delete('subject');
    url.searchParams.delete('file'); url.searchParams.delete('panel');
    url.searchParams.set('page', 'academic');
    window.history.pushState({ page: 'academic', subject: value }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  const openPanel = (file, nextPanel) => {
    setSelectedId(file.id); setPanel(nextPanel);
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'academic');
    url.searchParams.set('file', file.id);
    url.searchParams.set('panel', nextPanel);
    window.history.pushState({ page: 'academic', file: file.id }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const snap = await getDocs(query(FILES, orderBy('createdAt', 'desc'), startAfter(cursor), limit(PAGE_SIZE)));
      olderPagesLoaded.current = true;
      setOlder((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() }))]);
      if (snap.docs.length) setCursor(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (_) { setError('Could not load more resources. Please retry.'); }
    finally { setLoadingMore(false); }
  };
  const del = async (file) => {
    if (!isAdmin) return;
    requestConfirm({
      message: 'Delete this file record from the Academic Hub?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          const subjKey = cut(file.subject, 50);
          await deleteDoc(doc(FILES, file.id));
          if (subjKey) {
            try { await updateDoc(FOLDERS, { ['fileCounts.' + subjKey]: increment(-1) }); } catch (_) {}
          }
          setOlder((prev) => prev.filter((f) => f.id !== file.id));
          setLatest((prev) => prev.filter((f) => f.id !== file.id));
          if (selectedId === file.id) setSelectedId('');
          if (showToast) showToast('File record deleted.', 'info');
        } catch (_) { if (showToast) showToast('File deletion failed.', 'error'); }
      },
    });
  };
  const download = (event, file, links) => {
    if (!links.source) { event.preventDefault(); return; }
    const note = file.sourceType === 'supabase-storage' ? 'Your file download is being prepared. Please check browser download permissions if it does not start.' : file.sourceType === 'firebase-storage' ? 'Downloading the uploaded file. If it does not start, check browser download permissions.' : links.direct ? 'Download requested. The file host may still require sharing permission or confirmation.' : 'Opening the file host. This host may display the file rather than download it directly.';
    setDownloadStatus((prev) => ({ ...prev, [file.id]: note }));
  };

  return <div className="ah-root">
    <section className="ah-hero"><div><span className="ah-eyebrow ah-hero-kicker"><GraduationCap size={15} /> EduNexus Learning Library</span><h1>Academic Hub</h1><p className="ah-hero-lead">Your organized space for course handouts, lecture notes, study guides and carefully selected revision material. Explore a subject, preview supported resources, download files, and read or submit resource reviews without leaving your learning workspace.</p><div className="ah-hero-links"><a href="#academic-library">Explore the library <ArrowRight size={17} /></a><a href="#academic-study-guide">Study smarter <BookOpen size={17} /></a></div></div><div className="ah-hero-graphic" aria-hidden="true"><FolderOpen size={76} /><span>Learn · Practice · Review</span></div></section>

    <section className="ah-intro" aria-label="About the Academic Hub"><div className="ah-section-heading"><span className="ah-eyebrow">One library · multiple ways to learn</span><h2>Find the right material for your next study session</h2></div><p>The Academic Hub brings EduNexus resources into a subject-first experience. Instead of opening many folders and unrelated websites, begin with a course code and work through the available materials in one place. Each file card provides its title, subject and available viewing options, while the review panel gives students room to share useful feedback about a specific resource.</p><p>New uploads appear in the library as they become available. The page initially loads a manageable batch for faster rendering and lets you bring in additional files as needed. Counts shown below describe resources currently loaded in this browser, not the total size of the entire database. Use the existing administrator upload tools to keep adding folders, documents and links without changing the original storage system.</p></section>

    <section className="ah-intro" aria-label="Original subject study guides"><div className="ah-section-heading"><span className="ah-eyebrow">Learn before downloading</span><h2>Original subject explanations and worked examples</h2></div><p>Read an independently written explanation before choosing a PDF. These guides cover general course concepts; verify current syllabus and assignment requirements with your institution.</p><div className="ah-actions">{EDITORIAL_GUIDES.map(([code,label,slug]) => <a className="ah-secondary" key={code} href={'/learning/' + code.toLowerCase() + '/' + slug}>{label} <ArrowRight size={15} /></a>)}</div></section>

    {reviewIsAdmin(user, isAdmin) && <React.Suspense fallback={<p className="ah-note" role="status">Opening secure upload workspace…</p>}><AcademicAdminUploader user={user} subjects={subjects} initialSubject={subject} onUploaded={(code) => { setSearch(''); setFormat('all'); openSubject(code); }} /></React.Suspense>}

    {reviewIsAdmin(user, isAdmin) && <div className="ah-admin-tools" style={{margin:'12px 0'}}><button type="button" className="ah-secondary" onClick={async () => {
      if (!window.confirm('Recalculate true file counts for all folders? This reads all file records once.')) return;
      try {
        const snap = await getDocs(FILES);
        const counts = {};
        snap.docs.forEach((d) => { const k = cut(d.data()?.subject, 50); if (k) counts[k] = (counts[k] || 0) + 1; });
        await updateDoc(FOLDERS, { fileCounts: counts });
        if (showToast) showToast('Folder counts recalculated: ' + snap.size + ' files across ' + Object.keys(counts).length + ' folders.', 'success');
      } catch (e) { if (showToast) showToast('Count recalculation failed: ' + (e?.message || 'error'), 'error'); }
    }}><FolderOpen size={16} /> Recalculate folder counts</button></div>}

    <section id="academic-library" className="ah-library" aria-label="Academic resources"><div className="ah-section-heading"><span className="ah-eyebrow">Browse, preview & download</span><h2>Subject resource library</h2><p>Choose a subject, search the loaded resources and open a file directly in the page when preview is supported.</p></div>
      <div className="ah-stats"><div><strong>{subjects.length}</strong><span>Subject folders</span></div><div><strong>{(() => { const vals = Object.values(folderCounts); return vals.length ? vals.reduce((a, b) => a + (Number(b) || 0), 0) : files.length; })()}</strong><span>Total resources</span></div><div><strong>{files.length}</strong><span>Loaded for browsing</span></div></div>
      <div className="ah-toolbar"><label className="ah-search"><Search size={19} /><span className="ah-visually-hidden">Search resources</span><input value={search} onChange={(e) => { setSearch(e.target.value); setVisible(18); }} placeholder="Search file title, subject, topic or format…" /></label><button type="button" className="ah-secondary" onClick={() => { setSearch(''); setFormat('all'); openSubject(''); setSubjectsExpanded(true); }}><FolderOpen size={17} /> All subjects</button></div>
      <div className="ah-filterbar" aria-label="Filter and sort study files"><label>File type <select value={format} onChange={(e) => { setFormat(e.target.value); setVisible(18); }}><option value="all">All formats</option><option value="documents">Documents</option><option value="images">Images</option><option value="links">Other links</option></select></label><label>Sort by <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setVisible(18); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">File name A–Z</option></select></label><button type="button" className="ah-secondary" aria-expanded={subjectsExpanded} onClick={() => setSubjectsExpanded((v) => !v)}><FolderOpen size={16} /> {subjectsExpanded ? 'Hide folders' : 'Browse folders'}</button></div>
    {selected && <div className="ah-panel-wrap" ref={scroller}><div className="ah-panel-tabs" role="group" aria-label="Selected file tools"><button type="button" className={panel === 'preview' ? 'active' : ''} onClick={() => setPanel('preview')}><BookOpen size={16} /> Preview</button><button type="button" className={panel === 'reviews' ? 'active' : ''} onClick={() => setPanel('reviews')}><Star size={16} /> Reviews</button><button type="button" onClick={() => setSelectedId('')}><X size={16} /> Close</button></div>{panel === 'preview' ? <ResourcePreview file={selected} links={fileLinks(selected)} onClose={() => setSelectedId('')} /> : <FileReviews file={selected} user={user} isAdmin={isAdmin} />}</div>}
      {error && <p className="ah-message" role="alert">{error}</p>}
      {loading ? <div className="ah-loading" role="status"><div /><div /><div /><p>Loading academic resources…</p></div> :
        <>{subjectsExpanded && <div className="ah-subject-grid" aria-label="Subject folders">{subjects.map((code) => <button key={code} type="button" className={'ah-subject' + (subject === code ? ' active' : '')} aria-pressed={subject === code} onClick={() => openSubject(code)}><span className="ah-subject-icon"><BookOpen size={19} /></span><span><strong>{displayFolderName(code)}</strong><small>{(() => { const total = folderCounts[code] ?? counts[code] ?? 0; return total + (total === 1 ? ' file' : ' files'); })()}</small></span><ArrowRight size={16} /></button>)}</div>}
          <div className="ah-results-head"><div><span className="ah-eyebrow">{subject ? 'Selected subject' : 'Resource collection'}</span><h3>{subject || 'All available subjects'}</h3><p>{normalized ? 'Search results from currently loaded files' : 'Showing ' + displayed.length + ' of ' + matches.length + ' matching loaded resources'}</p></div>{subject && <button className="ah-secondary" type="button" onClick={() => openSubject('')}><ArrowLeft size={16} /> Back to subjects</button>}</div>
          {displayed.length ? <div className="ah-resource-grid">{displayed.map((file) => <ResourceCard key={file.id} file={file} isAdmin={isAdmin} onDelete={del} onPreview={(f) => openPanel(f, 'preview')} onReviews={(f) => openPanel(f, 'reviews')} onDownload={download} downloadStatus={downloadStatus[file.id]} />)}</div> : <div className="ah-empty"><FileArchive size={30} /><h3>No matching files in this loaded batch</h3><p>Try another subject or load more resources. You can also check the existing Academic Hub administrator tools for new uploads.</p></div>}
          {matches.length > displayed.length && <button className="ah-secondary ah-load" type="button" onClick={() => setVisible((n) => n + 18)}>Show more matching files <ArrowRight size={16} /></button>}
          {hasMore && <button className="ah-primary ah-load" type="button" disabled={loadingMore} onClick={more}>{loadingMore ? 'Loading more files…' : 'Load next ' + PAGE_SIZE + ' resources'} <ArrowRight size={16} /></button>}
        </>}
    </section>



    <section className="ah-guide" id="academic-study-guide"><div className="ah-section-heading"><span className="ah-eyebrow">Detailed learning guidance</span><h2>Turn study resources into a practical learning routine</h2><p>A well-organized collection is useful when every document has a purpose. These suggestions explain how to choose, evaluate and revisit academic material throughout your semester.</p></div><div className="ah-guidance-grid">{guidance.map((g) => <article className="ah-guidance" key={g.icon}><span className="ah-step">{g.icon}</span><h3>{g.title}</h3><p>{g.body}</p></article>)}</div></section>

    <section className="ah-outro"><div><span className="ah-eyebrow">Continue your learning</span><h2>Your next step is one useful resource away</h2><p>Select a subject, open a resource, record the concepts you need to revise and practice explaining them in your own words. Return to this hub for more files or use the existing exam-preparation tools for additional practice.</p></div><a href="/?page=exam-prep">Go to Exam Prep <ArrowRight size={17} /></a></section>
    <p className="ah-disclaimer">EduNexus is an independent student resource platform, not an official Virtual University service. Materials and student opinions may be incomplete or outdated; verify current course requirements with your institution. External file hosts control access and final download behavior.</p>
    <ConfirmUI />
  </div>;
}

