import './runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './dashboard-enhancer.css';
import './free-orb.css';
import './dashboard-hub.css';
import './content-hub.css';
import './tutorial-hub.css';
import './background-rotator.css';
import './content-hub-links.css';
import './professional-ai.css';
import './admin-content-manager.css';
import './ui-layer-fix.css';
import './responsive-hardening.css';
import './admin-resource-manager-v2.css';
import './firebase-console';
import App from './App';
import DashboardEnhancerSafe from './DashboardEnhancerSafe';
import ContentHub from './ContentHub';
import TutorialHub from './TutorialHub';
import AdminResourceManagerV2 from './AdminResourceManagerV2';
import { startHighlightsWarmup } from './highlights-warmup';
import { SEOManager } from './SEO';

const FRIENDLY_ROUTES = {
  '/vu-notes': 'academic', '/handouts': 'academic', '/past-papers': 'academic',
  '/quizzes': 'aiquiz', '/cgpa-calculator': 'cgpa', '/ai-tools': 'aiquiz',
  '/articles': 'articles', '/about': 'about', '/contact': 'contact',
  '/study-guides': 'guides', '/vu-notes-guide': 'vu-notes-guide',
  '/past-papers-guide': 'past-papers', '/exam-preparation': 'exam-preparation',
  '/cgpa-guide': 'cgpa-guide', '/ai-study-tools': 'ai-study-tools',
  '/student-resources': 'resources', '/live-projects': 'projects', '/tutorials': 'tutorials',
};

const pathname = window.location.pathname.replace(/\/$/, '') || '/';
const friendlyPage = FRIENDLY_ROUTES[pathname];
const params = new URLSearchParams(window.location.search);
if (friendlyPage && !params.get('page')) {
  params.set('page', friendlyPage);
  window.history.replaceState({}, '', `${pathname}?${params.toString()}`);
}
const initialPage = new URLSearchParams(window.location.search).get('page') || 'home';

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  }, { once: true });
}

startHighlightsWarmup();

const root = ReactDOM.createRoot(document.getElementById('root'));
// Deliberately avoid React.StrictMode here. The app mounts several global
// Firebase/auth listeners and floating UI components; a single production mount
// prevents duplicate listener initialization and avoids development-only effect
// replays being carried into the deployed runtime.
root.render(
  <>
    <SEOManager page={initialPage} />
    <DashboardEnhancerSafe />
    <ContentHub />
    <TutorialHub />
    <AdminResourceManagerV2 />
    <App />
  </>
);
