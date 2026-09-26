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
  '/tutorials': 'tutorials', '/exam-prep': 'exam-prep'
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

export function routeParamsFromPath(pathname) {
  const clean = String(pathname || '/').replace(/\/$/, '') || '/';
  const decode = (s) => { try { return decodeURIComponent(s); } catch (_) { return s; } };
  const parts = clean.split('/').filter(Boolean).map(decode);
  // /academic/<subject> e.g. /academic/CS609_System_Programming
  if (parts[0] === 'academic' && parts[1]) {
    return { page: 'academic', subject: parts[1].slice(0, 80), term: '' };
  }
  // /exam-prep/<subject>/<term> e.g. /exam-prep/CS609/Finalterm
  if (parts[0] === 'exam-prep' && parts[1] && parts[2]) {
    return { page: 'exam-prep', subject: parts[1].slice(0, 24), term: parts[2].slice(0, 24) };
  }
  return { page: '', subject: '', term: '' };
}

export function routeFromLocation(location) {
  const requested = new URLSearchParams(location.search || '').get('page');
  if (requested && APP_PAGES.includes(requested)) return requested;
  const pathname = String(location.pathname || '/').replace(/\/$/, '') || '/';
  const params = routeParamsFromPath(pathname);
  if (params.page) return params.page;
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
