import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getApps, initializeApp } from 'firebase/app';
import { collection, getFirestore, limit, onSnapshot, query } from 'firebase/firestore';
import { Activity, ArrowRight, Award, Bell, Brain, Calendar, CheckCircle2, FileText, FolderOpen, Gauge, Layers, Megaphone, RefreshCw, Search, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react';

const firebaseConfig = { apiKey: 'AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8', authDomain: 'edunexus-live-e0b84.firebaseapp.com', projectId: 'edunexus-live-e0b84', storageBucket: 'edunexus-live-e0b84.firebasestorage.app', messagingSenderId: '464541062794', appId: '1:464541062794:web:7894ed257d604f202bbf73' };
const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = 'edunexus-live';
const CACHE_KEY = 'edunexus_dashboard_fast_v4';

const FALLBACK_HIGHLIGHTS = [
  { id: 'academic', title: 'Academic Library', body: 'Browse course notes, handouts, past papers, quizzes, assignments, presentations and practical resources from one place.', icon: 'FolderOpen', tone: 'violet', tag: 'Study resources' },
  { id: 'ai', title: 'AI Study Tools', body: 'Turn your study material into focused practice with source-grounded AI Quiz and quick AI Flashcards.', icon: 'Brain', tone: 'blue', tag: 'Smart practice' },
  { id: 'planner', title: 'Study Planner', body: 'Organize subjects, sessions and goals into a simple routine so exam preparation stays on track.', icon: 'Calendar', tone: 'green', tag: 'Stay organized' },
  { id: 'community', title: 'Student Community', body: 'Ask questions, share useful resources and learn with other students through the Discussion area.', icon: 'Users', tone: 'amber', tag: 'Connect & learn' },
];

const ACTIONS = [
  { title: 'Academic Hub', body: 'Notes, handouts, past papers & more.', href: '/academic', icon: FolderOpen, tone: 'violet', tag: 'Library' },
  { title: 'AI Quiz', body: 'Practice with source-grounded questions.', href: '/?page=aiquiz', icon: Brain, tone: 'blue', tag: 'Practice' },
  { title: 'AI Flashcards', body: 'Revise concepts in fast recall rounds.', href: '/?page=flashcards', icon: Layers, tone: 'pink', tag: 'Revision' },
  { title: 'Study Planner', body: 'Plan subjects, sessions and goals.', href: '/?page=planner', icon: Calendar, tone: 'green', tag: 'Planning' },
  { title: 'CGPA Calculator', body: 'Calculate semester or overall CGPA.', href: '/?page=cgpa', icon: Gauge, tone: 'amber', tag: 'Calculator' },
  { title: 'Discussion', body: 'Ask, share and connect with students.', href: '/?page=forum', icon: Users, tone: 'cyan', tag: 'Community' },
];

const STUDY_PATHS = [
  { n: '01', title: 'Find your material', body: 'Jump to your course resources and get the material you need.', href: '/academic', icon: Search },
  { n: '02', title: 'Practice actively', body: 'Test recall with AI Quiz and Flashcards instead of only rereading.', href: '/?page=aiquiz', icon: Brain },
  { n: '03', title: 'Plan your sessions', body: 'Turn study goals into manageable sessions with the planner.', href: '/?page=planner', icon: Calendar },
  { n: '04', title: 'Track your preparation', body: 'Keep your revision focused and return to your tools every day.', href: '/?page=planner', icon: Target },
];

const ICONS = { FolderOpen, Brain, Calendar, Trophy, Megaphone, FileText, Sparkles, Activity, Users };
function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; } }
function writeCache(value) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch {} }
function formatCount(value) { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0); }
function subscribe(path, setter, fallback = []) { const q = query(collection(db, path), limit(120)); return onSnapshot(q, (snap) => setter(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setter(fallback)); }

function Stat({ icon: Icon, tone, value, label, note }) {
  return <div className="edx-stat-card"><div className={`edx-stat-icon ${tone}`}><Icon size={19} /></div><div className="edx-stat-copy"><strong>{value}</strong><span>{label}</span><small>{note}</small></div><Activity className="edx-stat-bg" /></div>;
}

function SmartDashboard() {
  const cached = useMemo(readCache, []);
  const [highlights, setHighlights] = useState(cached?.highlights?.length ? cached.highlights : FALLBACK_HIGHLIGHTS);
  const [files, setFiles] = useState(cached?.files || []);
  const [announcements, setAnnouncements] = useState(cached?.announcements || []);
  const [active, setActive] = useState(0);
  const [online, setOnline] = useState(Boolean(cached?.updatedAt));
  const [loadedAt, setLoadedAt] = useState(cached?.updatedAt || null);

  useEffect(() => {
    let mounted = true;
    const unsubs = [
      subscribe(`artifacts/${appId}/public/data/files`, (rows) => { if (mounted) setFiles(rows); }),
      subscribe(`artifacts/${appId}/public/data/announcements`, (rows) => { if (mounted) setAnnouncements(rows.slice(0, 20)); }),
      subscribe(`artifacts/${appId}/public/data/highlights`, (rows) => { if (!mounted) return; if (rows.length) setHighlights(rows); setOnline(true); setLoadedAt(Date.now()); }, []),
    ];
    const timer = window.setTimeout(() => mounted && setOnline(true), 900);
    return () => { mounted = false; window.clearTimeout(timer); unsubs.forEach((fn) => fn && fn()); };
  }, []);

  useEffect(() => { writeCache({ highlights, files: files.slice(0, 120), announcements: announcements.slice(0, 20), updatedAt: loadedAt || Date.now() }); }, [highlights, files, announcements, loadedAt]);
  useEffect(() => { if (highlights.length < 2) return undefined; const timer = window.setInterval(() => setActive((value) => (value + 1) % highlights.length), 5000); return () => window.clearInterval(timer); }, [highlights.length]);

  const courses = useMemo(() => { const values = files.map((item) => item.course || item.subject || item.folder).filter(Boolean); return new Set(values.map((value) => String(value).trim().toUpperCase())).size; }, [files]);
  const recent = useMemo(() => [...files].sort((a, b) => { const av = a.createdAt?.seconds || a.updatedAt?.seconds || 0; const bv = b.createdAt?.seconds || b.updatedAt?.seconds || 0; return bv - av; }).slice(0, 6), [files]);
  const current = highlights[active] || FALLBACK_HIGHLIGHTS[0];
  const CurrentIcon = ICONS[current.icon] || Sparkles;

  return <section className="edx-smart-dashboard" aria-label="EduNexus smart student dashboard">
    <div className="edx-smart-noise" aria-hidden="true" /><div className="edx-smart-glow edx-smart-glow-a" /><div className="edx-smart-glow edx-smart-glow-b" />
    <div className="edx-dashboard-topline"><div className="edx-smart-eyebrow"><Sparkles size={15} /> EduNexus Student Workspace</div><div className={`edx-live-status ${online ? 'is-online' : ''}`}><span /> {online ? 'Live & synced' : 'Connecting…'}</div></div>

    <div className="edx-smart-head"><div className="edx-smart-head-copy"><h2>Study smarter. <span>Find faster.</span> Prepare better.</h2><p>Your central study workspace for VU resources, exam preparation, AI practice, planning and student collaboration. Everything is organized to help you move from learning to confident revision.</p><div className="edx-hero-pills"><span><CheckCircle2 size={13} /> Fast first screen</span><span><Zap size={13} /> Live resources</span><span><Award size={13} /> Student-focused</span></div></div><div className="edx-dashboard-orbit" aria-hidden="true"><div className="edx-orbit-ring ring-one" /><div className="edx-orbit-ring ring-two" /><div className="edx-orbit-core"><Sparkles size={28} /></div></div></div>

    <div className="edx-stat-grid"><Stat icon={FolderOpen} tone="violet" value={formatCount(files.length)} label="Live resources" note="Available now" /><Stat icon={Layers} tone="blue" value={formatCount(courses)} label="Courses detected" note="From live library" /><Stat icon={RefreshCw} tone="green" value={formatCount(recent.length)} label="Recent updates" note="Fresh content" /><Stat icon={Award} tone="amber" value="24/7" label="Study access" note="Whenever you need it" /></div>

    <div className="edx-section-title"><div><span>Quick launch</span><h3>Everything important, one tap away</h3></div><small>Built for desktop, tablet & mobile</small></div>
    <div className="edx-action-grid">{ACTIONS.map(({ title, body, href, icon: Icon, tone, tag }) => <a className="edx-action-card" href={href} key={title}><div className={`edx-action-icon ${tone}`}><Icon size={21} /></div><div className="edx-action-copy"><span className="edx-card-tag">{tag}</span><strong>{title}</strong><em>{body}</em></div><ArrowRight className="edx-action-arrow" size={18} /></a>)}</div>

    <div className="edx-content-grid">
      <div className="edx-feature-panel edx-highlight-panel"><div className="edx-panel-label"><Megaphone size={16} /> Live highlights <span>Auto-updating</span></div><div className="edx-highlight-main" key={`${current.id || current.title}-${active}`}><div className={`edx-highlight-icon ${current.tone || 'violet'}`}><CurrentIcon size={25} /></div><div className="edx-highlight-copy"><span>{current.tag || 'Campus update'}</span><h3>{current.title}</h3><p>{current.body}</p></div></div><div className="edx-highlight-footer"><div className="edx-highlight-dots">{highlights.slice(0, 8).map((item, index) => <button key={item.id || index} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Show highlight ${index + 1}`} />)}</div><small><Activity size={13} /> Refreshes in background</small></div></div>
      <div className="edx-feature-panel edx-fast-panel"><div className="edx-panel-label"><Zap size={16} /> Fast first screen <span>Performance</span></div><h3>Useful content appears before the live refresh finishes.</h3><p>EduNexus keeps a lightweight snapshot in your browser. On repeat visits, cached highlights and dashboard data can appear immediately while Firestore quietly refreshes the latest information.</p><div className="edx-performance-list"><span><CheckCircle2 size={14} /> Instant fallback content</span><span><CheckCircle2 size={14} /> Local cache on repeat visits</span><span><CheckCircle2 size={14} /> Background synchronization</span><span><CheckCircle2 size={14} /> Reduced-motion friendly</span></div></div>
    </div>

    <div className="edx-section-title edx-resource-heading"><div><span>Fresh from the library</span><h3>Recently available resources</h3></div><a href="/academic">Open Academic Hub <ArrowRight size={16} /></a></div>
    <div className="edx-resource-grid">{(recent.length ? recent : FALLBACK_HIGHLIGHTS).slice(0, 6).map((item, index) => <a href="/academic" className="edx-resource-card" key={item.id || item.title || index}><div className="edx-resource-top"><div><FileText size={17} /><span>{item.course || item.subject || item.category || 'Study Resource'}</span></div><ArrowRight size={15} /></div><strong>{item.title || item.name || item.fileName || 'New academic resource'}</strong><p>{item.description || 'Open the Academic Hub to explore this resource and continue studying.'}</p></a>)}</div>

    <div className="edx-section-title"><div><span>Your study route</span><h3>A simple workflow for better preparation</h3></div></div>
    <div className="edx-path-grid">{STUDY_PATHS.map(({ n, title, body, href, icon: Icon }) => <a href={href} className="edx-path-card" key={n}><b>{n}</b><div className="edx-path-icon"><Icon size={18} /></div><div><strong>{title}</strong><p>{body}</p></div><ArrowRight size={16} /></a>)}</div>

    <div className="edx-study-banner"><div className="edx-study-orbit"><Brain size={27} /></div><div><span>Exam-ready workflow</span><h3>Learn → Practice → Revise → Track</h3><p>Use the library for source material, AI tools for active practice, flashcards for recall, and the planner to keep your study routine consistent.</p></div><a href="/academic">Start studying <ArrowRight size={17} /></a></div>
    <div className="edx-bottom-grid"><div className="edx-info-box"><div className="edx-info-icon"><Trophy size={19} /></div><div><strong>Build consistency, not just long sessions.</strong><p>Short focused sessions, active recall and a clear plan make it easier to return to your work every day.</p></div></div><div className="edx-info-box"><div className="edx-info-icon"><Bell size={19} /></div><div><strong>Stay aware of important updates.</strong><p>{announcements.length ? (announcements[0].title || announcements[0].message || 'A new student update is available in EduNexus.') : 'New announcements and student updates can appear here automatically.'}</p></div></div></div>
  </section>;
}

function mountPoint() {
  const main = document.querySelector('main'); if (!main) return null;
  const existing = main.querySelector('[data-edx-smart-dashboard-host]'); if (existing) return existing;
  const h1 = Array.from(main.querySelectorAll('h1')).find((node) => /Welcome to EduNexus/i.test(node.textContent || ''));
  const hero = h1?.closest('div.text-center') || h1?.parentElement;
  const host = document.createElement('div'); host.dataset.edxSmartDashboardHost = 'true';
  if (hero?.parentElement) hero.parentElement.insertBefore(host, hero.nextSibling); else main.insertBefore(host, main.firstChild);
  return host;
}

export default function DashboardEnhancement() {
  const [host, setHost] = useState(null); const [page, setPage] = useState(() => new URLSearchParams(window.location.search).get('page') || 'home');
  useEffect(() => { const syncPage = () => setPage(new URLSearchParams(window.location.search).get('page') || 'home'); window.addEventListener('popstate', syncPage); const timer = window.setInterval(syncPage, 500); return () => { window.removeEventListener('popstate', syncPage); window.clearInterval(timer); }; }, []);
  useEffect(() => { let alive = true; const find = () => { if (!alive) return; const target = mountPoint(); if (target) setHost(target); }; find(); const observer = new MutationObserver(find); observer.observe(document.body, { childList: true, subtree: true }); return () => { alive = false; observer.disconnect(); }; }, []);
  if (!host || page !== 'home') return null;
  return createPortal(<SmartDashboard />, host);
}
