import React, { useEffect, useMemo, useState } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { ArrowLeft, ExternalLink, Film, Link2, Play, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import './tutorial-hub.css';

const firebaseConfig = {
  apiKey: 'AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8',
  authDomain: 'edunexus-live-e0b84.firebaseapp.com',
  projectId: 'edunexus-live-e0b84',
  storageBucket: 'edunexus-live-e0b84.firebasestorage.app',
  messagingSenderId: '464541062794',
  appId: '1:464541062794:web:7894ed257d604f202bbf73'
};

const firebaseApp = getApps().find((app) => app.name === '[DEFAULT]') || initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const TUTORIALS = collection(db, 'artifacts/edunexus-live/public/data/tutorials');

const starterVideos = [
  { title: 'VU LMS Orientation', category: 'Virtual University', description: 'Official VU walkthrough for new students covering the LMS dashboard, lectures, notes, assessments and academic record.', url: 'https://www.youtube.com/watch?v=pFOw-5vzVtU', videoId: 'pFOw-5vzVtU', source: 'Virtual University of Pakistan' },
  { title: 'Active Recall for Better Revision', category: 'Study Skills', description: 'A practical explanation of active recall and how to turn ordinary reading into stronger retrieval practice.', url: 'https://www.youtube.com/watch?v=LfjLg0Wt4Z8', videoId: 'LfjLg0Wt4Z8', source: 'Giugyssima' },
  { title: 'Spaced Repetition for Exams', category: 'Study Skills', description: 'A clear introduction to spacing revision sessions so important topics are revisited before they fade.', url: 'https://www.youtube.com/watch?v=pmbJHBrHP4o', videoId: 'pmbJHBrHP4o', source: 'Pablo Sánchez Urina' }
];

function youtubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
  } catch (_) {}
  return '';
}

const getRoute = () => new URLSearchParams(window.location.search).get('page') || (window.location.pathname.replace(/\/$/, '') === '/tutorials' ? 'tutorials' : '');

export default function TutorialHub() {
  const [route, setRoute] = useState(getRoute);
  const [videos, setVideos] = useState([]);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('link');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'VU Tutorials', url: '', description: '' });
  const [file, setFile] = useState(null);

  useEffect(() => { const onPop = () => setRoute(getRoute()); window.addEventListener('popstate', onPop); window.addEventListener('edunexus:navigation', onPop); return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('edunexus:navigation', onPop); }; }, []);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (route !== 'tutorials') return undefined;
    const q = query(TUTORIALS, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setVideos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, [route]);

  const isAdmin = user?.email === 'veducator4@gmail.com' && user?.emailVerified === true;
  const allVideos = useMemo(() => [...videos, ...starterVideos.map((v, i) => ({ ...v, id: `starter-${i}`, starter: true }))], [videos]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !form.title.trim()) return;
    setSaving(true);
    try {
      let payload = { title: form.title.trim(), category: form.category.trim() || 'Tutorial', description: form.description.trim(), createdAt: serverTimestamp(), createdBy: user.email };
      if (mode === 'link') {
        const id = youtubeId(form.url.trim());
        payload = { ...payload, type: id ? 'youtube' : 'link', url: form.url.trim(), videoId: id };
      } else if (file) {
        if (!file.type.startsWith('video/')) throw new Error('Please select a video file.');
        if (file.size > 200 * 1024 * 1024) throw new Error('Video must be 200 MB or smaller.');
        const path = `tutorials/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const uploaded = await uploadBytes(storageRef(storage, path), file, { contentType: file.type });
        payload = { ...payload, type: 'file', url: await getDownloadURL(uploaded.ref), fileName: file.name, contentType: file.type };
      }
      await addDoc(TUTORIALS, payload);
      setForm({ title: '', category: 'VU Tutorials', url: '', description: '' });
      setFile(null);
      setOpen(false);
    } catch (error) {
      window.alert(error?.message || 'Tutorial save failed.');
    } finally { setSaving(false); }
  };

  const goHome = () => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('edunexus:navigation')); };
  if (route !== 'tutorials') return null;

  return <div className="edux-tutorial-overlay">
    <div className="edux-tutorial-bg" />
    <header className="edux-tutorial-nav">
      <button className="edux-tutorial-brand" onClick={goHome}><Film size={21}/><span>EduNexus Tutorials</span></button>
      <div className="edux-tutorial-navlinks"><a href="/study-guides">Study Guides</a><a href="/student-resources">Resources</a><a href="/vu-notes">Academic Hub</a></div>
      <button className="edux-tutorial-back" onClick={goHome}><ArrowLeft size={15}/> Back to app</button>
    </header>
    <main className="edux-tutorial-main">
      <section className="edux-tutorial-hero">
        <span className="edux-tutorial-pill">VIDEO LEARNING</span>
        <h1>Tutorials that show the process, not just the answer.</h1>
        <p>Watch practical walkthroughs for VU students, revision techniques and study tools. EduNexus supports both external video links and uploaded MP4/WebM tutorials for the site library.</p>
        <div className="edux-tutorial-actions"><a href="#tutorials"><Play size={16}/> Browse tutorials</a>{isAdmin && <button onClick={() => setOpen(true)}><Plus size={16}/> Add tutorial</button>}</div>
      </section>
      <section id="tutorials" className="edux-video-grid">
        {allVideos.map((video) => <article className="edux-video-card" key={video.id}>
          {video.type === 'file' ? <video className="edux-video-player" controls preload="metadata" src={video.url} /> : video.videoId ? <iframe className="edux-video-player" src={`https://www.youtube.com/embed/${video.videoId}`} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className="edux-video-linkbox"><Link2 size={30}/><span>External tutorial</span></div>}
          <div className="edux-video-body"><span className="edux-video-category">{video.category}</span><h2>{video.title}</h2><p>{video.description}</p><div className="edux-video-footer"><small>{video.source || video.fileName || 'EduNexus tutorial'}</small><a href={video.url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink size={14}/></a></div></div>
        </article>)}
      </section>
      <section className="edux-tutorial-note"><ShieldCheck size={20}/><div><h2>For students and contributors</h2><p>External videos stay credited to their original source. Site-owned tutorials can be uploaded by the verified EduNexus administrator, with a 200 MB video limit. This keeps the library useful without copying other creators' files.</p></div></section>
    </main>
    {open && <div className="edux-tutorial-modal" role="dialog" aria-modal="true"><form onSubmit={submit} className="edux-tutorial-form"><button type="button" className="edux-close" onClick={() => setOpen(false)}><X/></button><span className="edux-tutorial-pill">ADMIN UPLOAD</span><h2>Add a tutorial</h2><p>Add a YouTube/Vimeo-style external link or upload a video file you own.</p><label>Title<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required /></label><label>Category<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} /></label><div className="edux-mode"><button type="button" className={mode==='link'?'active':''} onClick={()=>setMode('link')}><Link2 size={15}/> Link</button><button type="button" className={mode==='file'?'active':''} onClick={()=>setMode('file')}><Upload size={15}/> Upload</button></div>{mode==='link'?<label>Video link<input type="url" value={form.url} onChange={(e)=>setForm({...form,url:e.target.value})} placeholder="https://www.youtube.com/watch?v=..." required /></label>:<label>Video file<input type="file" accept="video/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} required /></label>}<label>Description<textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} rows="4" placeholder="What will a student learn from this tutorial?" /></label><button className="edux-submit" disabled={saving}>{saving?'Saving...':'Publish tutorial'}</button></form></div>}
  </div>;
}
