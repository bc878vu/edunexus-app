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
import { routeFromLocation } from './app-routes.mjs';

const AdminResourceManagerV2 = React.lazy(() => import('./AdminResourceManagerV2'));

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  }, { once: true });
}

// The only public page outlet is App's shared main; admin floating controls stay intact.
function OptionalPages() {
  const [route, setRoute] = React.useState(() => routeFromLocation(window.location));
  React.useEffect(() => {
    const sync = () => setRoute(routeFromLocation(window.location));
    window.addEventListener('popstate', sync);
    window.addEventListener('edunexus:navigation', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('edunexus:navigation', sync);
    };
  }, []);
  return route === 'admin' ? <React.Suspense fallback={null}><AdminResourceManagerV2 /></React.Suspense> : null;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
// Deliberately avoid React.StrictMode here. The app mounts several global
// Firebase/auth listeners and floating UI components; a single production mount
// prevents duplicate listener initialization and avoids development-only effect
// replays being carried into the deployed runtime.
root.render(
  <>
    <SEOManager />
    <DashboardEnhancerSafe />
    <OptionalPages />
    <App />
  </>
);
