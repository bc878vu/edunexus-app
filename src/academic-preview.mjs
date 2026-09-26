// Only known document hosts and our own generated Storage blob may enter
// an Academic Hub iframe. Other external file links stay downloadable/openable.
const STORAGE_HOST = 'cprpndovdfnkvekewstv.supabase.co';
const PDF_HOSTS = new Set([STORAGE_HOST, 'res.cloudinary.com']);

export function trustedPreviewUrl(links, originalUrl, localUrl = '') {
  if (!links || typeof links !== 'object') return '';
  const kind = String(links.kind || '');
  if (kind === 'firebase' && /^blob:https?:\/\//.test(localUrl)) return localUrl;
  if (!originalUrl || typeof originalUrl !== 'string') return '';
  let url;
  try { url = new URL(originalUrl); } catch { return ''; }
  if (url.protocol !== 'https:' || url.username || url.password) return '';
  if (['drive','document','spreadsheet','presentation'].includes(kind)) {
    const wanted = kind === 'drive' ? 'drive.google.com' : 'docs.google.com';
    // The React app synthesizes these links from a validated Drive ID.
    return url.hostname === wanted
      && /^\/(?:file|document|spreadsheets|presentation)\/d\/[A-Za-z0-9_-]+\/preview$/.test(url.pathname)
      ? url.href : '';
  }
  if (kind === 'pdf' && PDF_HOSTS.has(url.hostname)) {
    if (url.hostname === STORAGE_HOST &&
      !url.pathname.startsWith('/storage/v1/object/public/edunexus-public-files/')) return '';
    if (url.hostname === 'res.cloudinary.com' &&
      !/\/(?:image|raw|video|auto)\/upload\//.test(url.pathname)) return '';
    return url.href;
  }
  return '';
}

export function previewSandbox(kind) {
  // Drive needs these capabilities to render Google's cross-origin viewer.
  // The parent site is a distinct origin; top navigation is never allowed.
  if (['drive','document','spreadsheet','presentation'].includes(kind))
    return 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
  // Chrome's built-in PDF viewer cannot run inside a sandboxed frame without
  // script execution (it shows "This page has been blocked by Chrome").
  // allow-scripts only lets the viewer render; top navigation, forms and
  // popups stay blocked, and only allowlisted URLs ever reach the frame.
  return 'allow-same-origin allow-scripts allow-downloads';
}
