import './runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './dashboard-enhancer.css';
import App from './App';
import DashboardEnhancer from './DashboardEnhancer';
import { SEOManager } from './SEO';

const FRIENDLY_ROUTES = {
  '/vu-notes': 'academic',
  '/handouts': 'academic',
  '/past-papers': 'academic',
  '/quizzes': 'aiquiz',
  '/cgpa-calculator': 'cgpa',
  '/ai-tools': 'aiquiz',
  '/articles': 'articles',
  '/about': 'about',
  '/contact': 'contact',
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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, { once: true });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SEOManager page={initialPage} />
    <DashboardEnhancer />
    <App />
  </React.StrictMode>
);
