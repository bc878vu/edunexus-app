// Single canonical URL contract shared by SPA metadata and server-rendered pages.
// Do not infer the public canonical host from window.location: both configured
// domains can serve the same content, and the URL should remain stable.
import { APP_PAGES, pathForPage, routeFromLocation } from './app-routes.mjs';

export const SITE = 'https://edunexus.dpdns.org';

// Only use paths that are actually recognized on a fresh App page load.
// pathForPage supplies a working ?page= URL for other SPA pages.
const INDEXABLE_FRIENDLY_PATHS = Object.freeze({
  home: '/', academic: '/vu-notes', articles: '/articles',
  aiquiz: '/quizzes', cgpa: '/cgpa-calculator', contact: '/contact',
  forum: '/forum', portfolio: '/portfolio', privacy: '/privacy', terms: '/terms'
});

const cleanSubject = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const cleanTerm = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
// Academic subjects are folder names such as CS609_System_Programming: keep
// letters, digits, underscores and hyphens so the pretty path stays stable.
const cleanAcademicSubject = (value) => String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);

// Human-readable label for a subject code or folder name, shared by the SPA
// metadata writer and the build-time prerender script.
export function displaySubjectName(value) {
  const cleaned = String(value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.toUpperCase() : '';
}

export function canonicalPath(page, search, pathParams) {
  if (!APP_PAGES.includes(page)) return '/';
  if (page === 'admin') return '/?page=admin';
  const params = new URLSearchParams(search || '');
  const pathSubject = (pathParams && pathParams.subject) || '';
  const pathTerm = (pathParams && pathParams.term) || '';
  // Give every subject/term MCQ bank its own canonical identity instead of
  // collapsing all of them onto the single generic exam-prep URL.
  if (page === 'exam-prep') {
    const subject = cleanSubject(params.get('subject') || pathSubject);
    const term = cleanTerm(params.get('term') || pathTerm);
    if (subject && (term === 'midterm' || term === 'finalterm'))
      return '/exam-prep/' + subject + '/' + (term === 'midterm' ? 'Midterm' : 'Finalterm');
    return '/exam-prep';
  }
  // Subject library views keep a stable pretty path; the /academic/:subject
  // rewrite serves the SPA shell while the query fallback keeps working.
  if (page === 'academic') {
    const subject = cleanAcademicSubject(params.get('subject') || pathSubject);
    if (subject) return '/academic/' + subject;
  }
  return INDEXABLE_FRIENDLY_PATHS[page] || pathForPage(page);
}

export function canonicalUrl(page, search, pathParams) {
  return SITE + canonicalPath(page, search, pathParams);
}

export function seoPageFromLocation(location) {
  return routeFromLocation(location);
}
