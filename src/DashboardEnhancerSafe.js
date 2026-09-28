import React, { useEffect, useMemo, useState } from 'react';
import { getMetaDoc, subscribeMetaDoc } from './db/files';

const defaults = [
  { label: 'Study Guides', href: '/study-guides' },
  { label: 'Tutorial Videos', href: '/tutorials' },
  { label: 'Student Resources', href: '/student-resources' },
  { label: 'Live Projects', href: '/live-projects' }
];
const page = () => new URLSearchParams(location.search).get('page') || 'home';

// Normalize the meta/floatingHub buttons payload into [{label, href}].
const normalizeButtons = (data) => {
  const d = data || {};
  if (!Array.isArray(d.buttons) || !d.buttons.length) return null;
  return d.buttons
    .filter(x => x && x.enabled !== false && x.label && x.href)
    .map(x => ({ label: String(x.label), href: String(x.href) }));
};

function sound() {
  try {
    const C = AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(640, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(980, c.currentTime + .08);
    g.gain.setValueAtTime(.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.07, c.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .12);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .12);
    setTimeout(() => c.close().catch(() => {}), 180);
  } catch (e) {}
}

function Orb({ hidden }) {
  const [items, setItems] = useState(defaults);
  const [i, setI] = useState(0);
  const [size, setSize] = useState(1);
  const [pos, setPos] = useState({ x: 20, y: 140 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = normalizeButtons(await getMetaDoc('floatingHub'));
        if (alive && list) setItems(list);
      } catch (e) {}
    };
    load();
    const unsubscribe = subscribeMetaDoc('floatingHub', { onInvalidate: load });
    return () => { alive = false; unsubscribe(); };
  }, []);
  const move = () => {
    const w = innerWidth, h = innerHeight, s = w < 769 ? 66 : 82, m = 14;
    const safeBottom = 150, safeRight = 125;
    const maxX = Math.max(m, w - s - m), maxY = Math.max(m, h - s - safeBottom);
    setPos({ x: Math.round(m + Math.random() * Math.max(1, maxX - m)), y: Math.round(m + Math.random() * Math.max(1, maxY - m)) });
    setSize(v => (v + 1) % 3);
  };
  useEffect(() => {
    if (hidden) return;
    move();
    const a = setInterval(move, 3200), b = setInterval(() => setI(v => (v + 1) % Math.max(1, items.length)), 2400);
    addEventListener('resize', move);
    return () => { clearInterval(a); clearInterval(b); removeEventListener('resize', move); };
  }, [hidden, items.length]);
  if (hidden) return null;
  const r = items[i] || defaults[0];
  return <a href={r.href} onClick={sound} className={`edx-free-orb edx-resource-orb edx-resource-size-${size}`} style={{ left: pos.x, top: pos.y, '--move-duration': `${2.1 + size * .5}s` }} aria-label={`Open ${r.label}`}><span className='edx-free-orb-core'><span key={r.label} className='edx-resource-label'>{r.label}</span></span><span className='edx-free-spark edx-free-spark-a'/><span className='edx-free-spark edx-free-spark-b'/></a>;
}

export default function DashboardEnhancerSafe() {
  const [p, setP] = useState(page);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const s = () => setP(page());
    addEventListener('popstate', s);
    addEventListener('edunexus:navigation', s);
    return () => { removeEventListener('popstate', s); removeEventListener('edunexus:navigation', s); };
  }, []);
  useEffect(() => {
    const s = () => {
      const d = document.documentElement, m = Math.max(1, d.scrollHeight - innerHeight);
      setProgress(scrollY / m * 100);
    };
    addEventListener('scroll', s, { passive: true });
    s();
    return () => removeEventListener('scroll', s);
  }, []);
  const label = useMemo(() => ({ home: 'Dashboard', 'exam-prep': 'Exam Prep', guides: 'Study Guides', tutorials: 'Tutorial Videos', resources: 'Student Resources', projects: 'Live Projects' }[p] || 'EduNexus'), [p]);
  return <><Orb hidden={p === 'admin' || p === 'exam-prep'}/><div className='edx-progress' aria-hidden='true'><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}/></div><div className='edx-page-pill' aria-hidden='true'><span className='edx-live-dot'/><span>{label}</span></div></>;
}
