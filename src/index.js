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
import './admin-content-manager.css';
import './ui-layer-fix.css';
import './responsive-hardening.css';
import './admin-resource-manager-v2.css';
import './firebase-console';
import App from './App';
import DashboardEnhancerSafe from './DashboardEnhancerSafe';
import { SEOManager } from './SEO';

const ContentHub = React.lazy(() => import('./ContentHub'));
const TutorialHub = React.lazy(() => import('./TutorialHub'));
const AdminResourceManagerV2 = React.lazy(() => import('./AdminResourceManagerV2'));

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

// HomePage already maintains its own highlights subscription; avoid a duplicate warmup listener.

// Keep optional route bundles out of the homepage's initial JavaScript.
// Route changes remain supported by both browser back/forward and in-app navigation.
const CONTENT_ROUTES = new Set([
  'guides', 'vu-notes-guide', 'past-papers', 'exam-preparation',
  'cgpa-guide', 'ai-study-tools', 'resources', 'projects'
]);
function currentOverlayRoute() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('page');
  if (requested) return requested;
  return FRIENDLY_ROUTES[window.location.pathname.replace(/\/$/, '')] || '';
}
function OptionalPages() {
  const [route, setRoute] = React.useState(currentOverlayRoute);
  React.useEffect(() => {
    const sync = () => setRoute(currentOverlayRoute());
    window.addEventListener('popstate', sync);
    window.addEventListener('edunexus:navigation', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('edunexus:navigation', sync);
    };
  }, []);
  return <React.Suspense fallback={null}>
    {CONTENT_ROUTES.has(route) && <ContentHub />}
    {route === 'tutorials' && <TutorialHub />}
    {route === 'admin' && <AdminResourceManagerV2 />}
  </React.Suspense>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
// Deliberately avoid React.StrictMode here. The app mounts several global
// Firebase/auth listeners and floating UI components; a single production mount
// prevents duplicate listener initialization and avoids development-only effect
// replays being carried into the deployed runtime.
root.render(
  <>
    <SEOManager page={initialPage} />
    <DashboardEnhancerSafe />
    <OptionalPages />
    <App />
  </>
);
