import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getMetaDoc, subscribeMetaDoc } from './db/files';
import { routeFromLocation } from './app-routes.mjs';

const DEFAULT_BUTTONS = Object.freeze([
  { label: 'Study Guides', href: '/study-guides', enabled: true },
  { label: 'Tutorial Videos', href: '/tutorials', enabled: true },
  { label: 'Student Resources', href: '/student-resources', enabled: true },
  { label: 'Live Projects', href: '/live-projects', enabled: true },
].map(Object.freeze));

const PAGE_LABELS = Object.freeze({
  home: 'Dashboard',
  academic: 'Academic Hub',
  'exam-prep': 'Exam Prep',
  articles: 'Knowledge Base',
  aiquiz: 'AI Quiz',
  flashcards: 'AI Flashcards',
  planner: 'Study Planner',
  cgpa: 'CGPA Calculator',
  forum: 'Discussion',
  portfolio: 'Portfolio',
  about: 'About EduNexus',
  contact: 'Contact',
  guides: 'Study Guides',
  'vu-notes-guide': 'VU Notes Guide',
  'past-papers': 'Past Papers Guide',
  'exam-preparation': 'Exam Preparation',
  'cgpa-guide': 'CGPA Planning Guide',
  'ai-study-tools': 'Responsible AI',
  resources: 'Student Resources',
  projects: 'Live Projects',
  tutorials: 'Tutorial Videos',
});

const currentPage = () => routeFromLocation(window.location);

const cleanButtons = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && item.enabled !== false && item.label && item.href)
    .map((item) => ({
      label: String(item.label).trim().slice(0, 42),
      href: String(item.href).trim(),
      enabled: true,
    }))
    .filter((item) => item.label && (/^\//.test(item.href) || /^https:\/\//i.test(item.href)));
};

function playClickSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(640, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    window.setTimeout(() => context.close().catch(() => {}), 180);
  } catch (_) {}
}

function FloatingResourceButton({ hidden = false }) {
  const [config, setConfig] = useState({ buttons: DEFAULT_BUTTONS, dashboardPinned: true });
  const [resourceIndex, setResourceIndex] = useState(0);
  const [sizeLevel, setSizeLevel] = useState(1);
  const [position, setPosition] = useState({ x: 24, y: 124 });
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const data = (await getMetaDoc('floatingHub')) || {};
        if (!alive) return;
        const configured = cleanButtons(data.buttons);
        setConfig({
          buttons: configured.length ? configured : DEFAULT_BUTTONS,
          dashboardPinned: data.dashboardPinned !== false,
        });
      } catch (_) {
        if (alive) setConfig((current) => current);
      }
    };

    void refresh();
    const unsubscribe = subscribeMetaDoc('floatingHub', { onInvalidate: refresh });
    const onConfigChanged = () => void refresh();
    window.addEventListener('edunexus:resource-config', onConfigChanged);
    return () => {
      alive = false;
      try { unsubscribe(); } catch (_) {}
      window.removeEventListener('edunexus:resource-config', onConfigChanged);
    };
  }, []);

  const resources = useMemo(() => {
    const configured = config.buttons.length ? config.buttons : DEFAULT_BUTTONS;
    if (config.dashboardPinned && !configured.some((item) => item.href === '/')) {
      return [{ label: 'Dashboard', href: '/', enabled: true }, ...configured];
    }
    return configured;
  }, [config]);

  useEffect(() => {
    setResourceIndex((index) => Math.min(index, Math.max(0, resources.length - 1)));
  }, [resources.length]);

  const moveButton = useCallback(() => {
    if (hidden) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orbSize = width <= 768 ? 70 : 88;
    const sideMargin = width <= 480 ? 12 : 16;
    const topSafe = width <= 639 ? 78 : 86;
    const bottomSafe = width <= 768 ? 112 : 132;

    const maxX = Math.max(sideMargin, width - orbSize - sideMargin);
    const maxY = Math.max(topSafe, height - orbSize - bottomSafe);
    const x = sideMargin + Math.random() * Math.max(1, maxX - sideMargin);
    const y = topSafe + Math.random() * Math.max(1, maxY - topSafe);

    setPosition({ x: Math.round(x), y: Math.round(y) });
    setSizeLevel((level) => (level + 1) % 3);
  }, [hidden]);

  useEffect(() => {
    if (hidden || !resources.length) return undefined;
    moveButton();
    const moveTimer = window.setInterval(moveButton, 3200);
    const labelTimer = window.setInterval(
      () => setResourceIndex((index) => (index + 1) % resources.length),
      2400,
    );
    window.addEventListener('resize', moveButton, { passive: true });
    return () => {
      window.clearInterval(moveTimer);
      window.clearInterval(labelTimer);
      window.removeEventListener('resize', moveButton);
    };
  }, [hidden, moveButton, resources.length]);

  if (hidden || !resources.length) return null;

  const resource = resources[resourceIndex] || resources[0];
  const isInternal = resource.href.startsWith('/');

  const handleClick = (event) => {
    playClickSound();
    setClicked(true);
    window.setTimeout(() => setClicked(false), 560);

    if (!isInternal) return;
    event.preventDefault();
    window.setTimeout(() => {
      window.history.pushState({}, '', resource.href);
      window.dispatchEvent(new Event('edunexus:navigation'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 110);
  };

  return (
    <a
      className={`edx-free-orb edx-resource-orb edx-resource-size-${sizeLevel} ${clicked ? 'edx-resource-clicked' : ''}`}
      href={resource.href}
      aria-label={`Open ${resource.label}`}
      title={`Open ${resource.label}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        '--move-duration': `${2.1 + sizeLevel * 0.5}s`,
      }}
      onClick={handleClick}
    >
      <span className="edx-free-orb-core">
        <span key={resource.label} className="edx-resource-label">{resource.label}</span>
      </span>
      <span className="edx-free-spark edx-free-spark-a" aria-hidden="true" />
      <span className="edx-free-spark edx-free-spark-b" aria-hidden="true" />
      <span className="edx-resource-ripple" aria-hidden="true" />
    </a>
  );
}

export default function DashboardEnhancerSafe() {
  const [page, setPage] = useState(currentPage);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const syncRoute = () => setPage(currentPage());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('edunexus:navigation', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('edunexus:navigation', syncRoute);
    };
  }, []);

  useEffect(() => {
    const syncProgress = () => {
      const documentElement = document.documentElement;
      const maximum = Math.max(1, documentElement.scrollHeight - window.innerHeight);
      setProgress((window.scrollY / maximum) * 100);
    };
    window.addEventListener('scroll', syncProgress, { passive: true });
    syncProgress();
    return () => window.removeEventListener('scroll', syncProgress);
  }, []);

  const label = useMemo(() => PAGE_LABELS[page] || 'EduNexus', [page]);

  return (
    <>
      <FloatingResourceButton hidden={page === 'admin'} />
      <div className="edx-progress" aria-hidden="true">
        <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      <div className="edx-page-pill" aria-hidden="true">
        <span className="edx-live-dot" />
        <span>{label}</span>
      </div>
    </>
  );
}
