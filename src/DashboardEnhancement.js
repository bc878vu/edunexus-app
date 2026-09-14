import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, limit, onSnapshot, query } from 'firebase/firestore';
import {
  Activity, ArrowRight, Brain, Calendar, CheckCircle, Clock, FileText,
  FolderOpen, Layers, Megaphone, RefreshCw, Sparkles, Target, Trophy, Zap
} from 'lucide-react';

const firebaseConfig = {
  apiKey: 'AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8',
  authDomain: 'edunexus-live-e0b84.firebaseapp.com',
  projectId: 'edunexus-live-e0b84',
  storageBucket: 'edunexus-live-e0b84.firebasestorage.app',
  messagingSenderId: '464541062794',
  appId: '1:464541062794:web:7894ed257d604f202bbf73'
};

const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = 'edunexus-live';
const CACHE_KEY = 'edunexus_dashboard_fast_v3';

const FALLBACK_HIGHLIGHTS = [
  { title: 'Academic Library', body: 'Browse course notes, handouts, past papers, quizzes, assignments and practical resources from one place.', icon: 'FolderOpen', tone: 'violet' },
  { title: 'AI Study Tools', body: 'Turn your study material into focused practice with AI Quiz and AI Flashcards whenever you need them.', icon: 'Brain', tone: 'blue' },
  { title: 'Study Planner', body: 'Build a simple daily routine, track your progress and keep exam preparation moving without losing focus.', icon: 'Calendar', tone: 'green' },
  { title: 'Student Community', body: 'Use Discussion to ask questions, share useful resources and learn with other students.', icon: 'Trophy', tone: 'amber' },
];

const ACTIONS = [
  { title: 'Academic Hub', body: 'Find notes, past papers and course resources fast.', href: '/academic', icon: FolderOpen, tone: 'violet' },
  { title: 'AI Quiz', body: 'Practice with source-grounded questions.', href: '/?page=aiquiz', icon: Brain, tone: 'blue' },
  { title: 'AI Flashcards', body: 'Revise key concepts in quick rounds.', href: '/?page=flashcards', icon: Layers, tone: 'pink' },
  { title: 'Study Planner', body: 'Organize subjects, sessions and goals.', href: '/?page=planner', icon: Calendar, tone: 'green' },
  { title: 'CGPA Calculator', body: 'Calculate your semester or overall CGPA.', href: '/?page=cgpa', icon: Target, tone: 'amber' },
  { title: 'Discussion', body: 'Connect, ask and share with students.', href: '/?page=forum', icon: Megaphone, tone: 'cyan' },
];

const ICONS = { FolderOpen, Brain, Calendar, Trophy, Megaphone, FileText, Sparkles, Activity };

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function writeCache(value) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch {}
}

function subscribe(path, setter, fallback = []) {
  const q = query(collection(db, path), limit(120));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    setter(rows);
  }, () => setter(fallback));
}

function formatCount(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

function SmartDashboard() {
  const cached = useMemo(readCache, []);
  const [highlights, setHighlights] = useState(cached?.highlights?.length ? cached.highlights : FALLBACK_HIGHLIGHTS);
  const [files, setFiles] = useState(cached?.files || []);
  const [announcements, setAnnouncements] = useState(cached?.announcements || []);
  const [active, setActive] = useState(0);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsubs = [];
    unsubs.push(subscribe(`artifacts/${appId}/public/data/files`, (rows) => { if (mounted) setFiles(rows); }));
    unsubs.push(subscribe(`artifacts/${appId}/public/data/announcements`, (rows) => { if (mounted) setAnnouncements(rows); }));
    unsubs.push(subscribe(`artifacts/${appId}/public/data/highlights`, (rows) => {
      if (!mounted) return;
      if (rows.length) setHighlights(rows);
      setOnline(true);
    }, []));
    const timer = window.setTimeout(() => mounted && setOnline(true), 900);
    return () => { mounted = false; window.clearTimeout(timer); unsubs.forEach((fn) => fn && fn()); };
  }, []);

  useEffect(() => {
    writeCache({ highlights, files: files.slice(0, 120), announcements: announcements.slice(0, 20) });
  }, [highlights, files, announcements]);

  useEffect(() => {
    if (highlights.length < 2) return undefined;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % highlights.length), 5000);
    return () => window.clearInterval(timer);
  }, [highlights.length]);

  const courses = useMemo(() => {
    const values = files.map((item) => item.course || item.subject || item.folder || item.category).filter(Boolean);
    return new Set(values.map((value) => String(value).trim().toUpperCase())).size;
  }, [files]);
  const recent = useMemo(() => [...files].sort((a, b) => {
    const av = a.createdAt?.seconds || a.updatedAt?.seconds || 0;
    const bv = b.createdAt?.seconds || b.updatedAt?.seconds || 0;
    return bv - av;
  }).slice(0, 6), [files]);
  const current = highlights[active] || FALLBACK_HIGHLIGHTS[0];
  const CurrentIcon = ICONS[current.icon] || Sparkles;

  return (
    <section className="edx-smart-dashboard" aria-label="EduNexus smart dashboard">
      <div className="edx-smart-glow edx-smart-glow-a" />
      <div className="edx-smart-glow edx-smart-glow-b" />

      <div className="edx-smart-head">
        <div>
          <div className="edx-smart-eyebrow"><Sparkles size={15} /> Smart Student Dashboard</div>
          <h2>Study smarter. <span>Find faster.</span> Prepare better.</h2>
          <p>Everything you need for VU study, revision and exam preparation—organized into one fast student workspace.</p>
        </div>
        <div className={`edx-live-status ${online ? 'is-online' : ''}`}><span /> {online ? 'Live data connected' : 'Loading live data'}</div>
      </div>

      <div className="edx-stat-grid">
        <div className="edx-stat-card"><div className="edx-stat-icon violet"><FolderOpen size={19} /></div><div><strong>{formatCount(files.length)}</strong><span>Live resources</span></div><Activity className="edx-stat-bg" /></div>
        <div className="edx-stat-card"><div className="edx-stat-icon blue"><Layers size={19} /></div><div><strong>{formatCount(courses)}</strong><span>Courses detected</span></div><Target className="edx-stat-bg" /></div>
        <div className="edx-stat-card"><div className="edx-stat-icon green"><RefreshCw size={19} /></div><div><strong>{formatCount(recent.length)}</strong><span>Recent updates</span></div><Zap className="edx-stat-bg" /></div>
        <div className="edx-stat-card"><div className="edx-stat-icon amber"><CheckCircle size={19} /></div><div><strong>24/7</strong><span>Study access</span></div><Clock className="edx-stat-bg" /></div>
      </div>

      <div className="edx-action-grid">
        {ACTIONS.map(({ title, body, href, icon: Icon, tone }) => (
          <a className="edx-action-card" href={href} key={title}>
            <div className={`edx-action-icon ${tone}`}><Icon size={21} /></div>
            <div className="edx-action-copy"><strong>{title}</strong><span>{body}</span></div>
            <ArrowRight className="edx-action-arrow" size={18} />
          </a>
        ))}
      </div>

      <div className="edx-content-grid">
        <div className="edx-feature-panel">
          <div className="edx-panel-label"><Megaphone size={16} /> Live highlights</div>
          <div className="edx-highlight-main">
            <div className={`edx-highlight-icon ${current.tone || 'violet'}`}><CurrentIcon size={25} /></div>
            <div><h3>{current.title}</h3><p>{current.body}</p></div>
          </div>
          <div className="edx-highlight-dots" aria-label="Highlight navigation">
            {highlights.slice(0, 8).map((item, index) => <button key={item.id || index} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Show highlight ${index + 1}`} />)}
          </div>
        </div>

        <div className="edx-feature-panel edx-fast-panel">
          <div className="edx-panel-label"><Zap size={16} /> Fast first screen</div>
          <h3>Cached content appears first.</h3>
          <p>EduNexus keeps a lightweight dashboard snapshot in your browser, then refreshes live content in the background. This keeps the useful parts visible even when the network is slow.</p>
          <div className="edx-mini-points"><span><CheckCircle size={14} /> Instant cached paint</span><span><CheckCircle size={14} /> Background refresh</span><span><CheckCircle size={14} /> Responsive on every screen</span></div>
        </div>
      </div>

      <div className="edx-section-heading"><div><span>Fresh resources</span><h3>Recently available in EduNexus</h3></div><a href="/academic">Open Academic Hub <ArrowRight size={16} /></a></div>
      <div className="edx-resource-grid">
        {(recent.length ? recent : FALLBACK_HIGHLIGHTS).slice(0, 6).map((item, index) => (
          <a href="/academic" className="edx-resource-card" key={item.id || item.title || index}>
            <div className="edx-resource-top"><FileText size={18} /><span>{item.course || item.subject || item.category || 'Study Resource'}</span></div>
            <strong>{item.title || item.name || item.fileName || 'New academic resource'}</strong>
            <p>{item.description || 'Open the Academic Hub to explore this resource and continue studying.'}</p>
          </a>
        ))}
      </div>

      <div className="edx-study-banner">
        <div className="edx-study-orbit"><Brain size={28} /></div>
        <div><span>Exam-ready workflow</span><h3>Learn → Practice → Revise → Track</h3><p>Use the library for source material, AI tools for practice, flashcards for recall, and the planner to keep your routine on track.</p></div>
        <a href="/academic">Start studying <ArrowRight size={17} /></a>
      </div>

      {announcements.length > 0 && <div className="edx-announcement-line"><Megaphone size={16} /><span>{announcements[0].title || announcements[0].message || 'New student update available'}</span></div>}
    </section>
  );
}

function mountPoint() {
  const main = document.querySelector('main');
  if (!main) return null;
  if (main.querySelector('[data-edx-smart-dashboard-host]')) return main.querySelector('[data-edx-smart-dashboard-host]');
  const h1 = Array.from(main.querySelectorAll('h1')).find((node) => /Welcome to EduNexus/i.test(node.textContent || ''));
  const hero = h1?.closest('div');
  const host = document.createElement('div');
  host.dataset.edxSmartDashboardHost = 'true';
  if (hero?.parentElement) hero.parentElement.insertBefore(host, hero.nextSibling); else main.insertBefore(host, main.firstChild);
  return host;
}

export default function DashboardEnhancement() {
  const [host, setHost] = useState(null);
  useEffect(() => {
    let alive = true;
    const find = () => { if (!alive) return; const target = mountPoint(); if (target) setHost(target); };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { alive = false; observer.disconnect(); if (host?.parentNode) host.parentNode.removeChild(host); };
  }, []);
  const page = new URLSearchParams(window.location.search).get('page') || 'home';
  if (!host || page !== 'home') return null;
  return createPortal(<SmartDashboard />, host);
}
