// Shared route resolution for App and its single page shell.
export const FRIENDLY_ROUTES = Object.freeze({
  '/vu-notes': 'academic', '/handouts': 'academic', '/past-papers': 'academic',
  '/quizzes': 'aiquiz', '/cgpa-calculator': 'cgpa', '/ai-tools': 'aiquiz',
  '/articles': 'articles', '/about': 'about', '/contact': 'contact',
  '/forum': 'forum', '/portfolio': 'portfolio', '/privacy': 'privacy', '/terms': 'terms',
  '/study-guides': 'guides', '/vu-notes-guide': 'vu-notes-guide',
  '/past-papers-guide': 'past-papers', '/exam-preparation': 'exam-preparation',
  '/cgpa-guide': 'cgpa-guide', '/ai-study-tools': 'ai-study-tools',
  '/student-resources': 'resources', '/live-projects': 'projects',
  '/tutorials': 'tutorials'
});

export const CONTENT_PAGE_IDS = Object.freeze([
  'guides', 'vu-notes-guide', 'past-papers', 'exam-preparation',
  'cgpa-guide', 'ai-study-tools', 'resources', 'projects'
]);

export const APP_PAGES = Object.freeze([
  'home', 'academic', 'exam-prep', 'articles', 'aiquiz', 'flashcards',
  'planner', 'cgpa', 'forum', 'portfolio', 'about', 'contact',
  'privacy', 'terms', 'admin', ...CONTENT_PAGE_IDS, 'tutorials'
]);

const CONTENT_PATHS = Object.freeze({
  guides: '/study-guides',
  'vu-notes-guide': '/vu-notes-guide',
  'past-papers': '/past-papers-guide',
  'exam-preparation': '/exam-preparation',
  'cgpa-guide': '/cgpa-guide',
  'ai-study-tools': '/ai-study-tools',
  resources: '/student-resources',
  projects: '/live-projects',
  tutorials: '/tutorials'
});

export function routeFromLocation(location) {
  const requested = new URLSearchParams(location.search || '').get('page');
  if (requested && APP_PAGES.includes(requested)) return requested;
  const pathname = String(location.pathname || '/').replace(/\/$/, '') || '/';
  return FRIENDLY_ROUTES[pathname] || 'home';
}

export function pathForPage(page) {
  if (page === 'home') return '/';
  if (Object.prototype.hasOwnProperty.call(CONTENT_PATHS, page)) return CONTENT_PATHS[page];
  return '/?page=' + encodeURIComponent(APP_PAGES.includes(page) ? page : 'home');
}

export function navActivePage(page) {
  if (CONTENT_PAGE_IDS.includes(page) || page === 'tutorials') return page === 'projects' ? 'portfolio' : 'academic';
  return page;
}
