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
import App from './App';
import DashboardEnhancer from './DashboardEnhancer';
import ContentHub from './ContentHub';
import TutorialHub from './TutorialHub';
import ProfessionalAIAssistant from './ProfessionalAIAssistant';
import AdminContentManager from './AdminContentManager';
import { startHighlightsWarmup } from './highlights-warmup';
import { SEOManager } from './SEO';

const FRIENDLY_ROUTES = {
  '/vu-notes': 'academic', '/handouts': 'academic', '/past-papers': 'academic', '/quizzes': 'aiquiz', '/cgpa-calculator': 'cgpa', '/ai-tools': 'aiquiz', '/articles': 'articles', '/about': 'about', '/contact': 'contact', '/study-guides': 'guides', '/vu-notes-guide': 'vu-notes-guide', '/past-papers-guide': 'past-papers', '/exam-preparation': 'exam-preparation', '/cgpa-guide': 'cgpa-guide', '/ai-study-tools': 'ai-study-tools', '/student-resources': 'resources', '/live-projects': 'projects', '/tutorials': 'tutorials'
};
const pathname = window.location.pathname.replace(/\/$/, '') || '/';
const friendlyPage = FRIENDLY_ROUTES[pathname];
const params = new URLSearchParams(window.location.search);
if (friendlyPage && !params.get('page')) { params.set('page', friendlyPage); window.history.replaceState({}, '', `${pathname}?${params.toString()}`); }
const initialPage = new URLSearchParams(window.location.search).get('page') || 'home';
if ('serviceWorker' in navigator && window.location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true });
startHighlightsWarmup();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><SEOManager page={initialPage} /><DashboardEnhancer /><ContentHub /><TutorialHub /><ProfessionalAIAssistant /><AdminContentManager /><App /></React.StrictMode>);
