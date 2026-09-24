// Single canonical URL contract shared by SPA metadata and server-rendered pages.
// Do not infer the public canonical host from window.location: both configured
// domains can serve the same content, and the URL should remain stable.
import { APP_PAGES, pathForPage, routeFromLocation } from './app-routes.mjs';

export const SITE = 'https://edunexus.dpdns.org';

// Only use paths that are actually recognized on a fresh App page load.
// pathForPage supplies a working ?page= URL for other SPA pages.
const INDEXABLE_FRIENDLY_PATHS = Object.freeze({
  home: '/', academic: '/vu-notes', articles: '/articles',
  aiquiz: '/quizzes', cgpa: '/cgpa-calculator'
});

export function canonicalPath(page) {
  if (!APP_PAGES.includes(page)) return '/';
  if (page === 'admin') return '/?page=admin';
  return INDEXABLE_FRIENDLY_PATHS[page] || pathForPage(page);
}

export function canonicalUrl(page) {
  return SITE + canonicalPath(page);
}

export function seoPageFromLocation(location) {
  return routeFromLocation(location);
}
