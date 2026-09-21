import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, BookOpen, Download, ExternalLink, FileArchive, FileText, FolderOpen, GraduationCap, Search, ShieldCheck, Star, X } from 'lucide-react';
import { db } from './firebase-client';
import './academic-hub-pro.css';

const BASE = ['artifacts', 'edunexus-live', 'public', 'data'];
const FILES = collection(db, ...BASE, 'files');
const FOLDERS = doc(db, ...BASE, 'meta', 'folders');
const DEFAULT_SUBJECTS = ['PHY101', 'CS101', 'MGT101', 'ENG101', 'CS201', 'MTH101', 'ISL201', 'PAK301'];
const PAGE_SIZE = 60;
const cut = (v, n = 300) => String(v == null ? '' : v).trim().slice(0, n);
const safeHttp = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const u = new URL(String(raw || ''), window.location.href);
    return u.protocol === 'https:' || (u.origin === window.location.origin && u.protocol === 'http:') ? u : null;
  } catch (_) { return null; }
};
const nameOf = (f) => cut(f.name || f.title || 'Untitled resource', 170);
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
  const image = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG'].includes(ext);
  const pdf = ext === 'PDF';
  if (url.hostname.endsWith('.cloudinary.com') && /^res\.cloudinary\.com$/i.test(url.hostname) && /\/(?:image|raw|video|auto)\/upload\//.test(url.pathname)) {
    const download = source.replace(/\/(image|raw|video|auto)\/upload\//, '/$1/upload/fl_attachment/');
    return { source, preview: image || pdf ? source : '', download, kind: image ? 'image' : pdf ? 'pdf' : 'file', direct: true };
  }
  return { source, preview: image || pdf ? source : '', download: source, kind: image ? 'image' : pdf ? 'pdf' : f.isLinkOnly && ext === 'LINK' ? 'external-link' : 'external', direct: url.origin === window.location.origin };
};
const safeFileName = (f) => {
  const base = nameOf(f).replace(/[\\/:*?"<>|]/g, '_').split('').filter((ch) => ch.charCodeAt(0) >= 32).join('').slice(0, 120);
  const ext = extOf(f).toLowerCase();
  return ext && ext !== 'link' && !base.toLowerCase().endsWith('.' + ext) ? base + '.' + ext : base;
};
const REVIEWS = (id) => collection(db, ...BASE, 'files', id, 'reviews');
const reviewDoc = (id, uid) => doc(db, ...BASE, 'files', id, 'reviews', uid);
const reviewIsAdmin = (user, isAdmin) => Boolean(isAdmin && user && user.email === 'veducator4@gmail.com' && user.emailVerified);

function ResourcePreview({ file, links, onClose }) {
  const ext = extOf(file);
  const isImage = links.kind === 'image';
  const canEmbed = Boolean(links.preview && (isImage || links.kind === 'pdf' || ['drive', 'document', 'spreadsheet', 'presentation'].includes(links.kind)));
  return <section className="ah-focus" aria-label="Resource preview">
    <div className="ah-between"><div><span className="ah-eyebrow">In-page preview</span><h3>{nameOf(file)}</h3></div><button type="button" className="ah-icon-button" onClick={onClose} aria-label="Close preview"><X size={19} /></button></div>
    {canEmbed ? (isImage ? <img className="ah-preview-image" loading="lazy" src={links.preview} alt={nameOf(file)} /> :
      <iframe className="ah-preview-frame" loading="lazy" title={'Preview of ' + nameOf(file)} src={links.preview} referrerPolicy="strict-origin-when-cross-origin" />) :
      <div className="ah-empty"><FileText size={26} /><p>A safe inline preview is not available for this resource type. You can still open the original file and use the download action where its host supports it.</p></div>}
    <div className="ah-preview-foot"><span>{ext} · {cut(file.subject, 50) || 'General'}</span>{links.source && <a href={links.source} target="_blank" rel="noopener noreferrer">Open original source <ExternalLink size={14} /></a>}</div>
    <p className="ah-note">Some Google Drive or external files require the owner's sharing permission; their provider may block embedded viewing.</p>
  </section>;
}

function FileReviews({ file, user, isAdmin }) {
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const admin = reviewIsAdmin(user, isAdmin);

  useEffect(() => {
    let alive = true;
    setItems([]); setMine(null); setStatus(''); setLoading(true); setPending([]);
    const approved = query(REVIEWS(file.id), where('status', '==', 'approved'), limit(100));
    const unsub = onSnapshot(approved, (snap) => {
      if (alive) { setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))); setLoading(false); }
    }, (error) => { if (alive) { setLoading(false); setStatus(error.code === 'permission-denied' ? 'Review access is denied. The updated Firestore rules must be published.' : 'Reviews could not load. Please check your connection.'); } });
    let ownUnsub = () => {};
    if (user?.uid) ownUnsub = onSnapshot(reviewDoc(file.id, user.uid), (snap) => {
      if (alive) setMine(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, () => {});
    let pendingUnsub = () => {};
    if (admin) pendingUnsub = onSnapshot(query(REVIEWS(file.id), where('status', '==', 'pending'), limit(40)), (snap) => { if (alive) setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); }, () => { if (alive) setStatus('Pending reviews could not be loaded. Check the published permissions.'); });
    return () => { alive = false; unsub(); ownUnsub(); pendingUnsub(); };
  }, [file.id, user?.uid, admin]);

  const publish = async (event) => {
    event.preventDefault();
    if (!user?.uid || comment.trim().length < 20 || comment.trim().length > 800) return;
    setBusy(true); setStatus('');
    try {
      await setDoc(reviewDoc(file.id, user.uid), { userId: user.uid, rating: Number(rating), comment: comment.trim(), status: 'pending', createdAt: serverTimestamp() });
      setMine({ userId: user.uid, rating: Number(rating), comment: comment.trim(), status: 'pending' });
      setComment(''); setStatus('Your review was submitted and is awaiting moderation. It is not public yet.');
    } catch (error) { setStatus(error.code === 'permission-denied' ? 'Review submission is blocked. The site administrator must deploy the Academic Hub review rules.' : 'Review could not be saved. Please try again.'); }
    finally { setBusy(false); }
  };
  const moderate = async (item, nextStatus) => {
    setBusy(true); setStatus('');
    try { await updateDoc(reviewDoc(file.id, item.id), { status: nextStatus, moderatedAt: serverTimestamp() }); setStatus(nextStatus === 'approved' ? 'Review approved.' : 'Review rejected.'); }
    catch (_) { setStatus('Moderation failed. Check administrator permissions.'); }
    finally { setBusy(false); }
  };
  const average = items.length ? (items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length).toFixed(1) : '';
  return <section className="ah-focus" aria-label="Resource reviews">
    <div className="ah-between"><div><span className="ah-eyebrow">Student resource reviews</span><h3>Read and review: {nameOf(file)}</h3></div><span className="ah-chip"><Star size={14} /> {average || 'New'} · {items.length} approved</span></div>
    <p>Tell other students whether this material is clear, relevant and useful for revision. Reviews are about this resource, not a guarantee of exam coverage or correctness.</p>
    {status && <div role="status" className="ah-message">{status}</div>}
    {loading ? <p>Loading reviews…</p> : items.length ? <div className="ah-review-list">{items.map((r) => <article className="ah-review" key={r.id}><div className="ah-between"><strong>Student review</strong><span className="ah-stars" aria-label={r.rating + ' out of 5 stars'}>{'★'.repeat(Math.max(0, Math.min(5, r.rating || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, r.rating || 0)))}</span></div><p>{cut(r.comment, 800)}</p></article>)}</div> : <div className="ah-empty">No approved reviews yet. Be the first to share thoughtful feedback.</div>}
    {user?.uid ? (mine ? <p className="ah-message">{mine.status === 'approved' ? 'Your review has been published.' : mine.status === 'rejected' ? 'Your review was not approved.' : 'Your review is awaiting moderation.'} Each student can submit one review per resource.</p> :
      <form className="ah-review-form" onSubmit={publish}><h4>Share your experience</h4><label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Helpful</option><option value={3}>3 — Average</option><option value={2}>2 — Needs improvement</option><option value={1}>1 — Not helpful</option></select></label><label>Written review<textarea required minLength={20} maxLength={800} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Describe what you learned and whether the material was clear…" /></label><p className="ah-note">Avoid sharing personal information, copyrighted excerpts or active exam content. Reviews are checked before appearing publicly.</p><button type="submit" className="ah-primary" disabled={busy || comment.trim().length < 20}>{busy ? 'Submitting…' : 'Submit review'}</button></form>) : <p className="ah-note">Sign in to leave a review.</p>}
    {admin && <div className="ah-review-queue"><h4><ShieldCheck size={17} /> Admin moderation · {pending.length} pending</h4>{pending.length ? pending.map((r) => <article key={r.id} className="ah-review"><strong>{r.rating} / 5 · Student review</strong><p>{cut(r.comment, 800)}</p><div className="ah-actions"><button type="button" className="ah-primary" disabled={busy} onClick={() => moderate(r, 'approved')}>Approve</button><button type="button" className="ah-secondary" disabled={busy} onClick={() => moderate(r, 'rejected')}>Reject</button></div></article>) : <p>No pending reviews for this resource.</p>}</div>}
  </section>;
}

function ResourceCard({ file, isAdmin, onDelete, onPreview, onReviews, onDownload, downloadStatus }) {
  const links = fileLinks(file);
  const title = nameOf(file);
  return <article className="ah-resource">
    <div className="ah-file-icon"><FileText size={22} /></div>
    <div className="ah-resource-content"><div className="ah-between ah-file-top"><h3>{title}</h3><span className="ah-chip">{extOf(file)}</span></div>
      <p className="ah-meta">{cut(file.subject, 50) || 'General'}{dateOf(file) ? ' · Added ' + dateOf(file) : ''}</p>
      {file.description && <p className="ah-description">{cut(file.description, 320)}</p>}
      <div className="ah-actions">
        <button type="button" className="ah-secondary" disabled={!links.source} onClick={() => onPreview(file)}><BookOpen size={16} /> Preview</button>
        <button type="button" className="ah-secondary" onClick={() => onReviews(file)}><Star size={16} /> Reviews</button>
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
  { icon: '07', title: 'Contribute constructive resource reviews', body: 'Once you have used a file, describe its clarity, strengths and limitations in a short review. Mention whether the examples are understandable and whether the material appears aligned with your course. Avoid uploading examination content that is still confidential or active. Reviews go through moderation before they are visible so the library remains focused on study guidance.' },
  { icon: '08', title: 'Get more from your EduNexus workspace', body: 'Use the Academic Hub for files, the Exam Prep section for curated practice MCQs and completed-paper experiences, and the existing study tools when you need a different way to revise. These features complement one another: a document provides the source, practice checks recall, and your own notes capture what still needs work. There is no need to install a separate browser extension to browse this library.' }
];

export default function AcademicHubPro({ user, isAdmin = false, showToast }) {
  const [latest, setLatest] = useState([]);
  const [older, setOlder] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState(() => new URLSearchParams(window.location.search).get('subject') || '');
  const [selectedId, setSelectedId] = useState('');
  const [panel, setPanel] = useState('preview');
  const [downloadStatus, setDownloadStatus] = useState({});
  const [visible, setVisible] = useState(18);
  const scroller = useRef(null);

  useEffect(() => {
    const onPop = () => { setSubject(new URLSearchParams(window.location.search).get('subject') || ''); setSelectedId(''); };
    window.addEventListener('popstate', onPop);
    const unsubFiles = onSnapshot(query(FILES, orderBy('createdAt', 'desc'), limit(PAGE_SIZE)), (snap) => {
      setLatest(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCursor((prev) => prev || (snap.docs[snap.docs.length - 1] || null));
      setHasMore((prev) => prev || snap.docs.length === PAGE_SIZE);
      setLoading(false); setError('');
    }, (e) => { setLoading(false); setError(e.code === 'permission-denied' ? 'The file library is not accessible with the currently deployed Firestore rules.' : 'Could not load files. Please check your connection and try again.'); });
    const unsubFolders = onSnapshot(FOLDERS, (snap) => setFolders(Array.isArray(snap.data()?.list) ? snap.data().list.filter((v) => typeof v === 'string') : []), () => {});
    return () => { unsubFiles(); unsubFolders(); window.removeEventListener('popstate', onPop); };
  }, []);

  const files = useMemo(() => {
    const map = new Map();
    [...latest, ...older].forEach((f) => map.set(f.id, f));
    return [...map.values()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [latest, older]);
  const counts = useMemo(() => files.reduce((m, f) => { const key = cut(f.subject, 50); if (key) m[key] = (m[key] || 0) + 1; return m; }, {}), [files]);
  const subjects = useMemo(() => [...new Set([...DEFAULT_SUBJECTS, ...folders, ...Object.keys(counts)].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [folders, counts]);
  const normalized = search.trim().toLowerCase();
  const matches = useMemo(() => files.filter((f) => (!subject || f.subject === subject) && (!normalized || [f.name, f.title, f.subject, f.description, f.ext].some((value) => String(value || '').toLowerCase().includes(normalized)))), [files, subject, normalized]);
  const displayed = matches.slice(0, visible);
  const selected = files.find((f) => f.id === selectedId);
  useEffect(() => { if (selectedId && scroller.current) scroller.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [selectedId]);
  const openSubject = (value) => {
    setSubject(value); setVisible(18); setSelectedId('');
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('subject', value); else url.searchParams.delete('subject');
    url.searchParams.set('page', 'academic');
    window.history.pushState({ page: 'academic', subject: value }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  const openPanel = (file, nextPanel) => {
    setSelectedId(file.id); setPanel(nextPanel);
    // Scroll after React mounts the selected file panel.
  };
  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const snap = await getDocs(query(FILES, orderBy('createdAt', 'desc'), startAfter(cursor), limit(PAGE_SIZE)));
      setOlder((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() }))]);
      if (snap.docs.length) setCursor(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (_) { setError('Could not load more resources. Please retry.'); }
    finally { setLoadingMore(false); }
  };
  const del = async (file) => {
    if (!isAdmin || !window.confirm('Delete this file record from the Academic Hub?')) return;
    try {
      await deleteDoc(doc(FILES, file.id));
      setOlder((prev) => prev.filter((f) => f.id !== file.id));
      setLatest((prev) => prev.filter((f) => f.id !== file.id));
      if (selectedId === file.id) setSelectedId('');
      if (showToast) showToast('File record deleted.', 'info');
    } catch (_) { if (showToast) showToast('File deletion failed.', 'error'); }
  };
  const download = (event, file, links) => {
    if (!links.source) { event.preventDefault(); return; }
    const note = links.direct ? 'Download requested. The file host may still require sharing permission or confirmation.' : 'Opening the file host. This host may display the file rather than download it directly.';
    setDownloadStatus((prev) => ({ ...prev, [file.id]: note }));
  };

  return <div className="ah-root">
    <section className="ah-hero"><div><span className="ah-eyebrow ah-hero-kicker"><GraduationCap size={15} /> EduNexus Learning Library</span><h1>Academic Hub</h1><p className="ah-hero-lead">Your organized space for course handouts, lecture notes, study guides and carefully selected revision material. Explore a subject, preview supported resources, download files, and read or submit resource reviews without leaving your learning workspace.</p><div className="ah-hero-links"><a href="#academic-library">Explore the library <ArrowRight size={17} /></a><a href="#academic-study-guide">Study smarter <BookOpen size={17} /></a></div></div><div className="ah-hero-graphic" aria-hidden="true"><FolderOpen size={76} /><span>Learn · Practice · Review</span></div></section>

    <section className="ah-intro" aria-label="About the Academic Hub"><div className="ah-section-heading"><span className="ah-eyebrow">One library · multiple ways to learn</span><h2>Find the right material for your next study session</h2></div><p>The Academic Hub brings EduNexus resources into a subject-first experience. Instead of opening many folders and unrelated websites, begin with a course code and work through the available materials in one place. Each file card provides its title, subject and available viewing options, while the review panel gives students room to share useful feedback about a specific resource.</p><p>New uploads appear in the library as they become available. The page initially loads a manageable batch for faster rendering and lets you bring in additional files as needed. Counts shown below describe resources currently loaded in this browser, not the total size of the entire database. Use the existing administrator upload tools to keep adding folders, documents and links without changing the original storage system.</p></section>

    <section id="academic-library" className="ah-library" aria-label="Academic resources"><div className="ah-section-heading"><span className="ah-eyebrow">Browse, preview & download</span><h2>Subject resource library</h2><p>Choose a subject, search the loaded resources and open a file directly in the page when preview is supported.</p></div>
      <div className="ah-stats"><div><strong>{subjects.length}</strong><span>Subject folders</span></div><div><strong>{files.length}</strong><span>Resources loaded</span></div><div><strong>{new Set(files.filter((f) => extOf(f) === 'PDF').map((f) => f.id)).size}</strong><span>PDF resources loaded</span></div></div>
      <div className="ah-toolbar"><label className="ah-search"><Search size={19} /><span className="ah-visually-hidden">Search resources</span><input value={search} onChange={(e) => { setSearch(e.target.value); setVisible(18); }} placeholder="Search by file title, subject, topic or format…" /></label><button type="button" className="ah-secondary" onClick={() => { setSearch(''); openSubject(''); }}><FolderOpen size={17} /> All subjects</button></div>
      {error && <p className="ah-message" role="alert">{error}</p>}
      {loading ? <div className="ah-loading" role="status"><div /><div /><div /><p>Loading academic resources…</p></div> :
        <><div className="ah-subject-grid" aria-label="Subject folders">{subjects.map((code) => <button key={code} type="button" className={'ah-subject' + (subject === code ? ' active' : '')} aria-pressed={subject === code} onClick={() => openSubject(code)}><span className="ah-subject-icon"><BookOpen size={19} /></span><span><strong>{code}</strong><small>{counts[code] || 0} loaded {counts[code] === 1 ? 'file' : 'files'}</small></span><ArrowRight size={16} /></button>)}</div>
          <div className="ah-results-head"><div><span className="ah-eyebrow">{subject ? 'Selected subject' : 'Resource collection'}</span><h3>{subject || 'All available subjects'}</h3><p>{normalized ? 'Search results from currently loaded files' : 'Showing ' + displayed.length + ' of ' + matches.length + ' matching loaded resources'}</p></div>{subject && <button className="ah-secondary" type="button" onClick={() => openSubject('')}><ArrowLeft size={16} /> Back to subjects</button>}</div>
          {displayed.length ? <div className="ah-resource-grid">{displayed.map((file) => <ResourceCard key={file.id} file={file} isAdmin={isAdmin} onDelete={del} onPreview={(f) => openPanel(f, 'preview')} onReviews={(f) => openPanel(f, 'reviews')} onDownload={download} downloadStatus={downloadStatus[file.id]} />)}</div> : <div className="ah-empty"><FileArchive size={30} /><h3>No matching files in this loaded batch</h3><p>Try another subject or load more resources. You can also check the existing Academic Hub administrator tools for new uploads.</p></div>}
          {matches.length > displayed.length && <button className="ah-secondary ah-load" type="button" onClick={() => setVisible((n) => n + 18)}>Show more matching files <ArrowRight size={16} /></button>}
          {hasMore && <button className="ah-primary ah-load" type="button" disabled={loadingMore} onClick={more}>{loadingMore ? 'Loading more files…' : 'Load next ' + PAGE_SIZE + ' resources'} <ArrowRight size={16} /></button>}
        </>}
    </section>

    {selected && <div className="ah-panel-wrap" ref={scroller}><div className="ah-panel-tabs" role="group" aria-label="Selected file tools"><button type="button" className={panel === 'preview' ? 'active' : ''} onClick={() => setPanel('preview')}><BookOpen size={16} /> Preview</button><button type="button" className={panel === 'reviews' ? 'active' : ''} onClick={() => setPanel('reviews')}><Star size={16} /> Reviews</button><button type="button" onClick={() => setSelectedId('')}><X size={16} /> Close</button></div>{panel === 'preview' ? <ResourcePreview file={selected} links={fileLinks(selected)} onClose={() => setSelectedId('')} /> : <FileReviews file={selected} user={user} isAdmin={isAdmin} />}</div>}

    <section className="ah-guide" id="academic-study-guide"><div className="ah-section-heading"><span className="ah-eyebrow">Detailed learning guidance</span><h2>Turn study resources into a practical learning routine</h2><p>A well-organized collection is useful when every document has a purpose. These suggestions explain how to choose, evaluate and revisit academic material throughout your semester.</p></div><div className="ah-guidance-grid">{guidance.map((g) => <article className="ah-guidance" key={g.icon}><span className="ah-step">{g.icon}</span><h3>{g.title}</h3><p>{g.body}</p></article>)}</div></section>

    <section className="ah-outro"><div><span className="ah-eyebrow">Continue your learning</span><h2>Your next step is one useful resource away</h2><p>Select a subject, open a resource, record the concepts you need to revise and practice explaining them in your own words. Return to this hub for more files or use the existing exam-preparation tools for additional practice.</p></div><a href="/?page=exam-prep">Go to Exam Prep <ArrowRight size={17} /></a></section>
    <p className="ah-disclaimer">EduNexus is an independent student resource platform, not an official Virtual University service. Materials and student opinions may be incomplete or outdated; verify current course requirements with your institution. External file hosts control access and final download behavior.</p>
  </div>;
}
