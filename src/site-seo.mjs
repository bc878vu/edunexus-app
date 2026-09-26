// Single canonical URL contract shared by SPA metadata and server-rendered pages.
// Do not infer the public canonical host from window.location: both configured
// domains can serve the same content, and the URL should remain stable.
import { APP_PAGES, pathForPage, routeFromLocation } from './app-routes.mjs';

export const SITE = 'https://edunexus.dpdns.org';

// Only use paths that are actually recognized on a fresh App page load.
// pathForPage supplies a working ?page= URL for other SPA pages.
const INDEXABLE_FRIENDLY_PATHS = Object.freeze({
  home: '/', academic: '/vu-notes', articles: '/articles',
  aiquiz: '/quizzes', cgpa: '/cgpa-calculator',
  forum: '/forum', portfolio: '/portfolio', privacy: '/privacy', terms: '/terms'
});

const cleanSubject = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const cleanTerm = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');

export function canonicalPath(page, search) {
  if (!APP_PAGES.includes(page)) return '/';
  if (page === 'admin') return '/?page=admin';
  const params = new URLSearchParams(search || '');
  // Give every subject/term MCQ bank its own canonical identity instead of
  // collapsing all of them onto the single generic exam-prep URL.
  if (page === 'exam-prep') {
    const subject = cleanSubject(params.get('subject'));
    const term = cleanTerm(params.get('term'));
    if (subject && (term === 'midterm' || term === 'finalterm'))
      return '/?page=exam-prep&subject=' + subject + '&term=' + (term === 'midterm' ? 'Midterm' : 'Finalterm');
    return '/?page=exam-prep';
  }
  // Subject library views keep the /vu-notes friendly path with the subject
  // as a query param (the existing /vu-notes rewrite preserves the query).
  if (page === 'academic') {
    const subject = cleanSubject(params.get('subject'));
    if (subject) return '/vu-notes?subject=' + subject;
  }
  return INDEXABLE_FRIENDLY_PATHS[page] || pathForPage(page);
}

export function canonicalUrl(page, search) {
  return SITE + canonicalPath(page, search);
}

export function seoPageFromLocation(location) {
  return routeFromLocation(location);
}
