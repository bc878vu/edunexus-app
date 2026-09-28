import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Download, ExternalLink, FileArchive, FileText, Folder, FolderOpen, GraduationCap, Link, Search, ShieldCheck, Star, X } from 'lucide-react';
import { storage } from './firebase-client';
import { getBlob, ref as storageRef } from 'firebase/storage';
import { USE_SUPABASE, supabase } from './supabase-client';
import { listFiles, getFile, getMetaDoc, setMetaDoc, bumpFolderCount, deleteFile, subscribeFiles, subscribeMetaDoc } from './db/files';
import { listReviews, addReview, updateReview, deleteReview, reportReview as reportReviewRecord, listReviewReports, refreshRatingSummary, subscribeReviews } from './db/reviews';
import './academic-hub-pro.css';
import './academic-hub-v2.css';
import { countWords, reviewQualityMessage } from './reviewQuality';
import { trustedPreviewUrl, previewSandbox, gviewEmbedUrl } from './academic-preview.mjs';
import { routeParamsFromPath } from './app-routes.mjs';
import { useConfirm } from './ConfirmDialog';
const AcademicAdminUploader = React.lazy(() => import('./AcademicAdminUploader'));

const DEFAULT_SUBJECTS = ['PHY101', 'CS101', 'MGT101', 'ENG101', 'CS201', 'MTH101', 'ISL201', 'PAK301'];
const EDITORIAL_GUIDES = [
  ['CS101','CS101: Computing fundamentals','cs101-from-bits-to-programs-a-practical-study-guide'],
  ['CS201','CS201: Programming examples','cs201-variables-functions-and-program-tracing'],
  ['CS620','CS620: Models and simulation','cs620-models-randomness-and-simulation-experiments'],
  ['HRM613','HRM613: Performance management','hrm613-goals-feedback-and-fair-performance-evaluation'],
  ['PHY101','PHY101: Motion and forces','phy101-motion-forces-and-units-worked-through'],
  ['MTH101','MTH101: Calculus worked examples','mth101-limits-derivatives-and-interpreting-change']
];
const PAGE_SIZE = 60;
const cut = (v, n = 300) => String(v == null ? '' : v).trim().slice(0, n);
// Display-only: zero-width space after each underscore gives the browser clean
// wrap points, so folder names break at word boundaries (never mid-word).
// The raw code value is untouched — keys, navigation and queries are unaffected.
const displayFolderName = (code) => String(code || '').replace(/_/g, '_\u200b');
// Hierarchy helper: main-folder key derived from a subject folder name.
// "CS101_Introduction_to_Computing" -> "CS", "MGT301" -> "MGT".
// Purely presentational — the folder list in Firestore is untouched, so no
// existing folder or file can be missed or deleted by this grouping.
const subjectPrefix = (code) => {
  const m = String(code || '').match(/^([A-Z]{2,})/);
  return m ? m[1] : 'Other';
};
// Alias merge (presentation only): "CS101", "CS101_Introduction_to_Computing" and
// "CS101-Complete-Study-Material-VU" all resolve to the single course code "CS101".
// Firestore folders and files are never renamed, moved or deleted by this grouping.
const extractCourseCode = (name) => {
  const m = String(name || '').toUpperCase().match(/^([A-Z]{2,}\d{3}[A-Z]?)/);
  return m ? m[1] : null;
};
const safeHttp = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const u = new URL(String(raw || ''), window.location.href);
    return u.protocol === 'https:' || (u.origin === window.location.origin && u.protocol === 'http:') ? u : null;
  } catch (_) { return null; }
};
const nameOf = (f) => cut(f.name || f.title || 'Untitled resource', 170);
// Every file link is a preview link: it opens the Academic Hub with the file's
// preview panel directly, so shared links land on the preview.
const slugForPreview = (value) => String(value || 'study-resource').normalize('NFKD').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'study-resource';
// Canonical share/preview URL. Server-rendered resource pages carry each
// file's own title, description and OG/Twitter metadata; when opened by a
// person they provide a direct "Preview this file" route into the SPA.
// Keep the share URL short. The opaque file id is enough for the server to
// load the resource and emit its real OG title/description; the short slug is
// only human-readable and is canonicalized server-side.
const filePreviewLink = (f) => '/vu-notes/file/' + encodeURIComponent(f.id) + '/' + slugForPreview(
  extractCourseCode(f.subject || '') || String(f.subject || '').split('_')[0] || 'resource'
);
const extOf = (f) => {
  const explicit = cut(f.ext, 10).replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (explicit && explicit !== 'LINK') return explicit;
  const part = (f.name || '').match(/\.([a-z0-9]{2,6})$/i);
  const url = safeHttp(f.url);
  const fromPath = url && url.pathname.match(/\.([a-z0-9]{2,6})$/i);
  return (part ? part[1] : fromPath ? fromPath[1] : 'LINK').toUpperCase();
};
// createdAt arrives as a Firestore Timestamp on the Firebase branch and as an
// ISO string on the Supabase branch — normalize both to epoch millis for
// sorting and display.
const createdAtMillis = (v) => {
  if (!v) return 0;
  if (typeof v === 'object') {
    if (typeof v.toMillis === 'function') { try { return v.toMillis(); } catch (_) { return 0; } }
    if (typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch (_) { return 0; } }
    if (v instanceof Date) return v.getTime();
  }
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : 0;
};
const dateOf = (f) => {
  try {
    const ms = createdAtMillis(f.createdAt);
    return ms > 0 ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  }
  catch (_) { return ''; }
};
const driveId = (url) => {
  if (!url || !/^(drive|docs)\.google\.com$/i.test(url.hostname)) return '';
  const match = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url.searchParams.get('id') || '';
};
const fileLinks = (f) => {
  const url = safeHttp(f.url || f.downloadUrl || f.fileUrl);
  if (!url) return { source: '', download: '', preview: '', kind: 'unavailable', direct: false };
  const source = url.href;
  // Supabase public study files can preview inline, while ?download requests a
  // downloadable response. Existing Firebase, Drive and Cloudinary links stay intact.
  if (f.sourceType === 'supabase-storage' && f.storageBucket === 'edunexus-public-files') {
    const ext = extOf(f);
    const preview = ['PDF', 'PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? source : '';
    return { source, preview, download: '/api/resource-download?id=' + encodeURIComponent(f.id), kind: ext === 'PDF' ? 'pdf' :
      ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext) ? 'image' : 'external', direct: false };
  }
  // New Firebase uploads have attachment disposition: clicking their URL downloads.
  // Their inline PDF/image preview is retrieved separately through the Storage SDK.
  if (f.sourceType === 'firebase-storage' && f.storagePath) {
    return { source, download: source, preview: '', kind: 'firebase', direct: true };
  }
  const id = driveId(url);
  const isDriveFolder = /^(drive|docs)\.google\.com$/i.test(url.hostname) && /\/folders\//.test(url.pathname);
  if (id && !isDriveFolder) {
    const isDocs = url.hostname === 'docs.google.com';
    const kind = isDocs && /\/document\//.test(url.pathname) ? 'document'
      : isDocs && /\/spreadsheets\//.test(url.pathname) ? 'spreadsheet'
      : isDocs && /\/presentation\//.test(url.pathname) ? 'presentation' : 'drive';
    const preview = kind === 'drive' ? 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview'
      : kind === 'document' ? 'https://docs.google.com/document/d/' + encodeURIComponent(id) + '/preview'
      : kind === 'spreadsheet' ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/preview'
      : 'https://docs.google.com/presentation/d/' + encodeURIComponent(id) + '/preview';
    const download = kind === 'document' ? 'https://docs.google.com/document/d/' + encodeURIComponent(id) + '/export?format=pdf'
      : kind === 'spreadsheet' ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/export?format=xlsx'
      : kind === 'presentation' ? 'https://docs.google.com/presentation/d/' + encodeURIComponent(id) + '/export/pdf'
      : 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
    return { source, preview, download, kind, direct: true };
  }
  if (isDriveFolder) return { source, preview: '', download: source, kind: 'folder', direct: false };
  const ext = extOf(f);
  const image = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(ext);
  const pdf = ext === 'PDF';
  if (url.hostname.endsWith('.cloudinary.com') && /^res\.cloudinary\.com$/i.test(url.hostname) && /\/(?:image|raw|video|auto)\/upload\//.test(url.pathname)) {
    const download = source.replace(/\/(image|raw|video|auto)\/upload\//, '/$1/upload/fl_attachment/');
    return { source, preview: image || pdf ? source : '', download, kind: image ? 'image' : pdf ? 'pdf' : 'file', direct: true };
  }
  return { source, preview: image || pdf ? source : '', download: source, kind: image ? 'image' : pdf ? 'pdf' : f.isLinkOnly && ext === 'LINK' ? 'external-link' : 'external', direct: url.origin === window.location.origin };
};
const safeFileName = (f) => {
  const base = String(f.originalFilename || nameOf(f)).replace(/[\\/:*?"<>|]/g, '_').split('').filter((ch) => ch.charCodeAt(0) >= 32).join('').slice(0, 120);
  const ext = extOf(f).toLowerCase();
  return ext && ext !== 'link' && !base.toLowerCase().endsWith('.' + ext) ? base + '.' + ext : base;
};
const reviewIsAdmin = (user, isAdmin) => Boolean(isAdmin && user && user.email === 'veducator4@gmail.com' && user.emailVerified);

// Denormalized rating summary stored as fields on the file document itself.
// The public catalogue query already loads every file document, so reading
// ratingAverage/ratingCount costs zero extra reads (previously one
// getAggregateFromServer query ran per visible card). FileCardRating reads
// these fields first and keeps the live aggregation as the fallback while
// they are absent. The summary is refreshed best-effort after every review
// write via refreshRatingSummary() from ../db/reviews (adapter: recomputes
// from approved reviews and writes the file doc on both backends).
const readRatingSummary = (data) => {
  const value = Number(data?.ratingAverage);
  const total = Number(data?.ratingCount);
  return Number.isFinite(value) && Number.isInteger(total) && total > 0 ? value : null;
};

// Verify fetched bytes are genuinely a PDF before they are framed without a
// sandbox. A blob: URL inherits our origin, so only real PDFs (checked via the
// %PDF- magic bytes) may use the unsandboxed viewer path; anything else falls
// back to the download link.
function verifyPdfBlob(blob) {
  if (!blob || blob.size > 20 * 1024 * 1024) return Promise.reject(new Error('preview pdf too large'));
  return blob.slice(0, 5).text().then((head) => {
    if (head !== '%PDF-') throw new Error('preview is not a pdf');
    return blob;
  });
}

// Android Chrome (and some other mobile browsers) cannot render a PDF from a
// blob: URL inside an iframe — the frame shows "This content is blocked" —
// while desktop Chrome renders the same blob fine. Mobile browsers therefore
// default to our own PDF.js renderer, which needs neither the native PDF
// plugin nor Google's viewer service.
function isMobileBrowser() {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

// Self-contained in-page PDF renderer (PDF.js). Unlike the blob: iframe it
// does not need the browser's native PDF plugin, and unlike Google Docs
// Viewer it does not need docs.google.com to be reachable — the PDF bytes we
// already fetched are rendered to canvas. Intentionally no workerSrc: a worker
// file would need extra CSP (worker-src) and bundler wiring; pdf.js falls
// back to parsing on the main thread, which is fine for a preview.
// Self-contained in-page PDF renderer (PDF.js). Unlike the blob: iframe it
// does not need the browser's native PDF plugin, and unlike Google Docs
// Viewer it does not need docs.google.com to be reachable — the PDF bytes we
// already fetched are rendered to canvas.
// Design: continuous vertical scroll through ALL pages (touch-friendly),
// lazy rendering via IntersectionObserver (safe for 300+ page PDFs),
// pinch-to-zoom on touch devices, and memory cleanup for far-off pages.
// Self-contained in-page PDF renderer (PDF.js). Unlike the blob: iframe it
// does not need the browser's native PDF plugin, and unlike Google Docs
// Viewer it does not need docs.google.com to be reachable — the PDF bytes we
// already fetched are rendered to canvas.
// Design: continuous vertical scroll through ALL pages (touch-friendly),
// lazy rendering via IntersectionObserver (safe for 300+ page PDFs),
// pinch-to-zoom + zoom buttons on touch devices.
// Robustness rules (learned from live testing):
// - zoom is passed EXPLICITLY to renderPage — never read from a ref that a
//   separate effect syncs (that race made canvases explode to 7000px+).
// - NEVER blank a rendered canvas (no width=0 tricks): if a cleanup clears a
//   page the observer will not re-fire for an already-intersecting element,
//   leaving it blank forever. Memory is bounded by lazy rendering instead:
//   only pages near the viewport are ever rendered.
function PdfJsPreview({ blob }) {
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const pageWrapRefs = useRef({});   // pageNum -> wrapper div
  const canvasRefs = useRef({});     // pageNum -> canvas
  const renderedRef = useRef(new Set()); // "page|zoom" keys already rendered
  const pinchRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1); // nearest visible page
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(1); // 1 = fit width; user zoom is relative to current viewport
  const [viewerWidth, setViewerWidth] = useState(0);
  const zoomTimerRef = useRef(0);
  const [fitScale, setFitScale] = useState(0);
  const fitScaleRef = useRef(0);
  const [pageAspect, setPageAspect] = useState(1.414); // h/w placeholder ratio
  // Mirror zoom in a ref ONLY for the pinch gesture (touch handlers are
  // registered once); every render path takes zoom as an explicit argument.
  const zoomRef = useRef(1);

  // Load the PDF once; keep the document in a ref.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading'); setNumPages(0); setPageNum(1); setPageInput('1'); setZoom(1); zoomRef.current = 1;
    renderedRef.current.clear(); pageWrapRefs.current = {}; canvasRefs.current = {};
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // pdf.js v6 REQUIRES a real worker file in the browser (its fake-worker
        // fallback does a runtime import of workerSrc, so leaving it unset
        // fails). The file is deployed at /pdf.worker.min.mjs and CSP
        // worker-src 'self' allows it. NOTE: if pdfjs-dist is ever upgraded,
        // re-copy node_modules/pdfjs-dist/build/pdf.worker.min.mjs to public/.
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        // Polyfills for older mobile browsers: pdf.js v6 uses recent
        // Uint8Array extras (toHex/toBase64/fromBase64) and
        // Promise.withResolvers, which are missing on Chrome < ~129 and
        // crash getDocument() with "toHex is not a function".
        if (typeof Uint8Array.prototype.toHex !== 'function') {
          Uint8Array.prototype.toHex = function () {
            let s = '';
            for (let i = 0; i < this.length; i++) s += this[i].toString(16).padStart(2, '0');
            return s;
          };
        }
        if (typeof Uint8Array.prototype.toBase64 !== 'function') {
          Uint8Array.prototype.toBase64 = function () {
            let s = '';
            const CH = 0x8000;
            for (let i = 0; i < this.length; i += CH) {
              s += String.fromCharCode.apply(null, this.subarray(i, i + CH));
            }
            return btoa(s);
          };
        }
        if (typeof Uint8Array.fromBase64 !== 'function') {
          Uint8Array.fromBase64 = function (str) {
            const bin = atob(str);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
          };
        }
        if (typeof Promise.withResolvers !== 'function') {
          Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
            return { promise, resolve, reject };
          };
        }
        const data = new Uint8Array(await blob.arrayBuffer());
        if (cancelled) return;
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) { try { pdfDoc.destroy(); } catch (e) {} return; }
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        // Fit-width scale + aspect ratio from page 1 (used for placeholders).
        const page = await pdfDoc.getPage(1);
        if (cancelled) return;
        const v1 = page.getViewport({ scale: 1 });
        const el = containerRef.current;
        const availW = el ? Math.max(el.clientWidth - 24, 200) : 360;
        const initialFit = Math.max(availW / v1.width, 0.2);
        fitScaleRef.current = initialFit;
        setFitScale(initialFit);
        setPageAspect(v1.height / v1.width);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      if (pdfDocRef.current) { try { pdfDocRef.current.destroy(); } catch (e) {} pdfDocRef.current = null; }
    };
  }, [blob]);

  // Recompute fit-width scale when the container width changes (layout
  // settling, rotation). Does NOT depend on zoom — zoom multiplies on top.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let cancelled = false; let raf = 0;
    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (cancelled || !pdfDocRef.current || !containerRef.current) return;
        const measured = containerRef.current.clientWidth;
        setViewerWidth(measured);
        const w = measured - 24;
        if (w <= 0) return;
        pdfDocRef.current.getPage(1).then((page) => {
          if (cancelled) return;
          const v1 = page.getViewport({ scale: 1 });
          const ns = Math.max(w / v1.width, 0.2);
          fitScaleRef.current = ns;
          setFitScale((prev) => (Math.abs(prev - ns) > 0.02 ? ns : prev));
        }).catch(() => {});
      });
    };
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    const t = setTimeout(recompute, 350);
    return () => { cancelled = true; ro.disconnect(); clearTimeout(t); cancelAnimationFrame(raf); };
  }, [status]);

  // Render one page into its canvas. zoomV is ALWAYS passed explicitly by the
  // caller — this function never guesses the zoom from a ref.
  const renderPage = useCallback(async (n, zoomV) => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRefs.current[n];
    if (!pdfDoc || !canvas || !fitScale || !zoomV) return;
    const z = Math.min(3, Math.max(0.5, +zoomV.toFixed(2)));
    const key = n + '|' + z.toFixed(2);
    if (renderedRef.current.has(key)) return;
    renderedRef.current.add(key);
    try {
      const page = await pdfDoc.getPage(n);
      const live = canvasRefs.current[n];
      if (!live) { renderedRef.current.delete(key); return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = fitScale * z;
      // Backing store at DPR for sharpness; CSS size set explicitly so zoom
      // visibly magnifies the page inside the fixed viewer frame.
      const viewport = page.getViewport({ scale: scale * dpr });
      const css = page.getViewport({ scale });
      live.width = Math.floor(viewport.width);
      live.height = Math.floor(viewport.height);
      live.style.width = Math.floor(css.width) + 'px';
      live.style.height = Math.floor(css.height) + 'px';
      await page.render({ canvasContext: live.getContext('2d'), viewport }).promise;
    } catch (err) {
      renderedRef.current.delete(key);
    }
  }, [fitScale]);

  // Render the pages currently near the viewport (used after zoom changes and
  // on first ready). Walks the wrappers and renders those intersecting the
  // container plus a small margin — no full-document render.
  const renderVisiblePages = useCallback((zoomV) => {
    const el = containerRef.current;
    if (!el || status !== 'ready') return;
    const cTop = el.getBoundingClientRect().top;
    const vh = el.clientHeight || 600;
    for (let i = 1; i <= numPages; i++) {
      const w = pageWrapRefs.current[i];
      if (!w) continue;
      const r = w.getBoundingClientRect();
      // Within 1.5 viewports above/below the visible area.
      if (r.bottom > cTop - vh * 1.5 && r.top < cTop + vh * 2.5) {
        renderPage(i, zoomV);
      }
    }
  }, [status, numPages, renderPage]);

  // Lazy rendering: observe page wrappers, render when near the viewport.
  // The observer callback closes over the CURRENT zoom (effect re-runs when
  // zoom changes), so no ref race is possible.
  useEffect(() => {
    if (status !== 'ready' || !containerRef.current) return;
    const z = zoom;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) renderPage(Number(en.target.dataset.page), z);
      });
    }, { root: containerRef.current, rootMargin: '900px 0px' });
    Object.values(pageWrapRefs.current).forEach((el) => el && obs.observe(el));
    // Render what is visible right now at the current zoom.
    renderVisiblePages(z);
    return () => obs.disconnect();
  }, [status, numPages, zoom, renderPage, renderVisiblePages]);

  // Scroll handler: track nearest visible page for the toolbar indicator.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || status !== 'ready') return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cTop = el.getBoundingClientRect().top;
        for (let i = 1; i <= numPages; i++) {
          const w = pageWrapRefs.current[i];
          if (!w) continue;
          const r = w.getBoundingClientRect();
          if (r.bottom > cTop + 80) {
            if (i !== pageNum) { setPageNum(i); setPageInput(String(i)); }
            break;
          }
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [status, numPages, pageNum]);

  // Single place that changes zoom: updates state + ref together, then
  // re-renders the visible pages at the EXACT new value (no waiting for
  // effects, no ref timing gap). Stable via useCallback so the pinch effect
  // below always sees the current status/numPages through renderVisiblePages.
  const applyZoom = useCallback((nz) => {
    const z = Math.min(4, Math.max(0.5, +nz.toFixed(2)));
    zoomRef.current = z;
    setZoom(z);
    // Debounce expensive high-DPI canvas work while tapping/pinching quickly.
    // CSS gives instant feedback; PDF.js redraws sharply when interaction settles.
    clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => renderVisiblePages(z), 90);
  }, [renderVisiblePages]);
  const changeZoom = (dir) => {
    // Fine control near fit-width, faster steps only at high magnification.
    const current = zoomRef.current;
    const step = current < 1.5 ? 0.10 : 0.20;
    applyZoom(current + (dir > 0 ? step : -step));
  };
  const resetZoom = () => applyZoom(1);
  // Browser "Desktop site" on a phone changes the CSS viewport width. We use
  // the measured viewer width rather than user-agent detection, so rotation,
  // desktop-site toggles and split-screen all refit automatically.
  const compactViewer = viewerWidth > 0 && viewerWidth < 720;

  // Pinch-to-zoom on touch devices. One-finger scrolling stays native
  // (touch-action: pan-x pan-y on the container); we only intercept two
  // fingers, and only while pinching.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchRef.current = { dist: Math.max(d, 1), zoom: zoomRef.current };
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault(); // suppress native scroll while pinching
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const nz = Math.min(4, Math.max(0.5, pinchRef.current.zoom * (d / pinchRef.current.dist)));
        applyZoom(+nz.toFixed(2));
      }
    };
    const onTouchEnd = (e) => { if (e.touches.length < 2) pinchRef.current = null; };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyZoom]);

  const scrollToPage = (n) => {
    const clamped = Math.min(Math.max(1, n || 1), numPages || 1);
    const w = pageWrapRefs.current[clamped];
    if (w && containerRef.current) containerRef.current.scrollTop = Math.max(w.offsetTop - 12, 0);
    setPageNum(clamped); setPageInput(String(clamped));
  };

  if (status === 'error') {
    return (
      <div className="pdfjs-fallback">
        <p>This PDF could not be rendered in the browser.</p>
        <button type="button" className="pdfjs-btn" onClick={() => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = 'document.pdf'; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }}>Download PDF</button>
      </div>
    );
  }

  return (
    <div className={`pdfjs-viewer ${compactViewer ? "pdfjs-compact" : "pdfjs-wide"}`}>
      <div className="pdfjs-toolbar" role="toolbar" aria-label="PDF controls">
        <button type="button" className="pdfjs-btn" onClick={() => scrollToPage(pageNum - 1)} disabled={pageNum <= 1} aria-label="Previous page">‹</button>
        <input
          className="pdfjs-pageinput" value={pageInput} aria-label="Page number"
          onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => { const n = parseInt(pageInput, 10); if (n >= 1 && n <= numPages) scrollToPage(n); else setPageInput(String(pageNum)); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { const n = parseInt(pageInput, 10); if (n >= 1 && n <= numPages) scrollToPage(n); else setPageInput(String(pageNum)); e.target.blur(); } }}
        />
        <span className="pdfjs-pagetotal">/ {numPages || '…'}</span>
        <button type="button" className="pdfjs-btn" onClick={() => scrollToPage(pageNum + 1)} disabled={numPages > 0 && pageNum >= numPages} aria-label="Next page">›</button>
        <span className="pdfjs-sep" aria-hidden="true" />
        <button type="button" className="pdfjs-btn" onClick={() => changeZoom(-1)} disabled={zoom <= 0.5} aria-label="Zoom out">−</button>
        <button type="button" className="pdfjs-zoomlabel" onClick={resetZoom} aria-label="Fit page to viewer" title="Fit width">{Math.round(zoom * 100)}%</button>
        <button type="button" className="pdfjs-btn" onClick={() => changeZoom(1)} disabled={zoom >= 4} aria-label="Zoom in">+</button>
      </div>
      <div className="pdfjs-hint">Swipe to scroll pages · Pinch to zoom</div>
      <div className="pdfjs-pagewrap" ref={containerRef}>
        {status === 'loading' && <div className="pdfjs-loading">Loading PDF…</div>}
        {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className="pdfjs-page"
            data-page={n}
            ref={(el) => { if (el) pageWrapRefs.current[n] = el; }}
            style={{ aspectRatio: `1 / ${pageAspect}` }}
          >
            <canvas
              className="pdfjs-canvas"
              ref={(el) => { if (el) canvasRefs.current[n] = el; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


function ResourcePreview({ file, links, onClose }) {
  const ext = extOf(file);
  const isImage = links.kind === 'image' || (links.kind === 'firebase' && ['JPG','JPEG','PNG','WEBP'].includes(ext));
  const isPdf = ext === 'PDF' && (links.kind === 'pdf' || links.kind === 'firebase');
  const supportedFirebase = links.kind === 'firebase' && (isImage || ext === 'PDF')
    && (!Number.isFinite(file.size) || file.size <= 20 * 1024 * 1024);
  // Direct-URL PDFs (Supabase/Cloudinary) are fetched as same-origin blobs:
  // Chrome's built-in PDF viewer is blocked in sandboxed cross-origin frames,
  // so we serve the bytes through a blob: URL like the Firebase flow instead
  // of framing the cross-origin storage URL directly.
  const directPdfUrl = links.kind === 'pdf' && ext === 'PDF' ? trustedPreviewUrl(links, links.preview, '') : '';
  const supportedDirectPdf = Boolean(directPdfUrl)
    && (!Number.isFinite(file.size) || file.size <= 20 * 1024 * 1024);
  const [localUrl, setLocalUrl] = useState('');
  const [state, setState] = useState('idle');
  const [pdfBlob, setPdfBlob] = useState(null);
  // PDF viewer choice: 'blob' renders fetched bytes in the native viewer
  // (desktop Chrome), 'pdfjs' renders the bytes with our own PDF.js renderer
  // (mobile default — needs neither the native PDF plugin nor Google), and
  // 'gview' renders through Google Docs Viewer (fallback when the bytes cannot
  // be fetched at all).
  const [viewerOverride, setViewerOverride] = useState(null);
  const mobileDefault = useMemo(isMobileBrowser, []);
  const pdfMode = isPdf ? (viewerOverride || (mobileDefault ? 'pdfjs' : 'blob')) : 'blob';
  // Source URL for Google Docs Viewer: the validated direct PDF URL, or the
  // Firebase Storage download URL for firebase-kind PDFs.
  const gviewSource = links.kind === 'pdf' ? directPdfUrl
    : (links.kind === 'firebase' && ext === 'PDF' && /^https:\/\//.test(links.source || '') ? links.source : '');
  const gviewUrl = pdfMode === 'gview' ? trustedPreviewUrl({ kind: 'gview' }, gviewEmbedUrl(gviewSource), '') : '';
  const fileKeyRef = useRef('');
  useEffect(() => {
    const fileKey = links.kind + '|' + links.preview + '|' + (file.storagePath || '');
    if (fileKeyRef.current !== fileKey) {
      // New file: drop any viewer choice carried over from the previous one.
      fileKeyRef.current = fileKey;
      if (viewerOverride !== null) { setViewerOverride(null); return; }
    }
    if (isPdf && pdfMode === 'gview') {
      // Google Docs Viewer fetches the public PDF itself; nothing to download.
      if (gviewUrl) { setLocalUrl(''); setPdfBlob(null); setState('ready'); }
      else { setLocalUrl(''); setPdfBlob(null); setState('idle'); }
      return;
    }
    let loadBlob = null;
    if (supportedFirebase && file.storagePath) {
      if (USE_SUPABASE) {
        // Legacy firebase-kind files migrated to Supabase Storage: fetch the
        // bytes through the Storage API instead of the Firebase SDK.
        // TODO(storage): the storage data-migration must keep `storageBucket`
        // on these legacy records pointing at the migrated Supabase bucket;
        // records still carrying the firebase bucket name fall back to
        // 'edunexus-public-files' here (and to the Google viewer on failure).
        const bucket = file.storageBucket && !/\.firebasestorage\.app$/i.test(String(file.storageBucket))
          ? file.storageBucket : 'edunexus-public-files';
        loadBlob = supabase.storage.from(bucket).download(file.storagePath).then(({ data, error }) => {
          if (error || !data) throw error || new Error('preview download failed');
          return data;
        }).then(verifyPdfBlob);
      } else {
        loadBlob = getBlob(storageRef(storage, file.storagePath), 20 * 1024 * 1024).then(verifyPdfBlob);
      }
    } else if (supportedDirectPdf && directPdfUrl) {
      loadBlob = fetch(directPdfUrl, { mode: 'cors' }).then((res) => {
        if (!res.ok) throw new Error('preview fetch failed: ' + res.status);
        const ctype = res.headers.get('content-type') || '';
        if (!/pdf/i.test(ctype)) throw new Error('preview is not a pdf');
        const len = parseInt(res.headers.get('content-length') || '0', 10);
        if (len > 20 * 1024 * 1024) throw new Error('preview pdf too large');
        return res.blob();
      }).then(verifyPdfBlob);
    }
    if (!loadBlob) { setLocalUrl(''); setPdfBlob(null); setState('idle'); return; }
    let alive = true;
    let objectUrl = '';
    setLocalUrl(''); setPdfBlob(null); setState('loading');
    loadBlob.then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalUrl(objectUrl); setPdfBlob(blob); setState('ready');
    }).catch(() => {
      // Bytes could not be fetched (network/CORS/verification): fall back to
      // Google Docs Viewer, which fetches the public file itself.
      if (alive) setViewerOverride('gview');
    });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.storagePath, file.storageBucket, supportedFirebase, supportedDirectPdf, directPdfUrl, links.preview, links.kind, links.source, isPdf, pdfMode, gviewUrl, viewerOverride, ext]);
  const displayUrl = localUrl || links.preview;
  const frameUrl = pdfMode === 'gview' && isPdf ? gviewUrl : trustedPreviewUrl(links, links.preview, localUrl);
  // Until a direct PDF's blob is ready — or if it can't be fetched — keep the
  // blocked cross-origin URL out of the iframe and show the loading/download
  // message instead.
  const directPdfBlocked = pdfMode === 'blob' && links.kind === 'pdf' && ext === 'PDF' && !/^blob:/.test(localUrl || '');
  const pdfJsReady = pdfMode === 'pdfjs' && isPdf && Boolean(localUrl) && Boolean(pdfBlob);
  const canEmbed = Boolean(isImage ? displayUrl : (pdfMode === 'pdfjs' && isPdf ? pdfJsReady : frameUrl)) && !directPdfBlocked;
  // Chrome's built-in PDF viewer is blocked inside ANY sandboxed iframe —
  // verified live: sandbox="allow-scripts allow-same-origin" still shows "This
  // page has been blocked by Chromium" for both direct and blob: URLs, while
  // the same URLs render fine with no sandbox attribute. Verified PDF blobs
  // (bytes we fetched from an allowlisted host and checked for the %PDF-
  // signature) therefore render without the sandbox attribute. Every other
  // preview kind keeps the sandbox.
  const isVerifiedPdfBlob = pdfMode === 'blob' && ext === 'PDF' && /^blob:/.test(frameUrl || '');
  return <section className="ah-focus" aria-label="Resource preview">
    <div className="ah-between"><div><span className="ah-eyebrow">In-page preview</span><h3>{nameOf(file)}</h3></div><button type="button" className="ah-icon-button" onClick={onClose} aria-label="Close preview"><X size={19} /></button></div>
    {state === 'loading' && <div className="ah-loading" role="status"><div /><p>Preparing a secure in-page preview…</p></div>}
    {canEmbed ? (isImage ? <img className="ah-preview-image" loading="lazy" src={displayUrl} alt={nameOf(file)} /> :
      pdfMode === 'pdfjs' && isPdf ? <PdfJsPreview blob={pdfBlob} /> :
      <iframe className="ah-preview-frame" loading="lazy" title={'Preview of ' + nameOf(file)} src={frameUrl} sandbox={isVerifiedPdfBlob ? undefined : previewSandbox(links.kind)} referrerPolicy="no-referrer" />) :
      state !== 'loading' && <div className="ah-empty"><FileText size={26} /><p>{state === 'error' ? 'The file could not be previewed in this browser (possibly because of Storage CORS settings). Its download link remains available.' : 'Only known PDF and document hosts are previewed inside EduNexus. If the viewer cannot load, use the existing Download button to open the original file.'}</p></div>}
    <div className="ah-preview-foot"><span>{ext} · {cut(file.subject, 50) || 'General'}</span>{isPdf && gviewSource && <button type="button" onClick={() => {
      const order = ['blob', 'pdfjs', 'gview'];
      setViewerOverride(order[(order.indexOf(pdfMode) + 1) % order.length]);
    }} style={{ background: 'none', border: 0, padding: 0, color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}>{pdfMode === 'blob' ? 'Try PDF renderer' : pdfMode === 'pdfjs' ? 'Try Google viewer' : 'Try native viewer'}</button>}</div>
  </section>;
}

function FileReviews({ file, user, isAdmin }) {
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState({});
  const { requestConfirm, ConfirmUI } = useConfirm();
  const [reportResults, setReportResults] = useState({});
  const admin = reviewIsAdmin(user, isAdmin);

  useEffect(() => {
    let alive = true;
    setItems([]); setMine(null); setStatus(''); setLoading(true); setPending([]); setEditing(null);
    const refreshApproved = async () => {
      try {
        const reviews = await listReviews(file.id, { status: 'approved' });
        if (!alive) return;
        setItems(reviews.filter((r) => r.isActive !== false)
          .sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt)));
        setLoading(false);
      } catch (error) {
        if (!alive) return;
        setLoading(false);
        setStatus(error && error.code === 'permission-denied' ? 'Review access is denied. The updated Firestore rules must be published.' : 'Reviews could not load. Please check your connection.');
      }
    };
    const refreshMine = async () => {
      // The review doc id == user id; any review change re-derives the own review.
      if (!user?.uid) return;
      try {
        const all = await listReviews(file.id, { status: 'all' });
        if (alive) setMine(all.find((r) => r.id === user.uid) || null);
      } catch (_) {}
    };
    const refreshPending = async () => {
      try {
        const queued = await listReviews(file.id, { status: 'pending' });
        if (alive) setPending(queued);
      } catch (_) {}
    };
    refreshApproved();
    refreshMine();
    if (admin) refreshPending();
    const unsub = subscribeReviews(file.id, { status: 'approved', onInvalidate: refreshApproved });
    const ownUnsub = user?.uid ? subscribeReviews(file.id, { status: 'all', onInvalidate: refreshMine }) : () => {};
    let pendingUnsub = () => {};
    // Only historical pending records need an administrator action. New reviews publish immediately.
    if (admin) pendingUnsub = subscribeReviews(file.id, { status: 'pending', onInvalidate: refreshPending });
    return () => { alive = false; unsub(); ownUnsub(); pendingUnsub(); };
  }, [file.id, user?.uid, admin]);

  const publish = async (event) => {
    event.preventDefault();
    const value = comment.trim();
    if (!user?.uid || mine || !Number.isInteger(Number(rating))) return;
    // The Firestore review rules require at least 20 characters. Validate
    // locally so a short review gets a clear message instead of a permission error.
    if (value.length < 20) { setStatus('Please write at least 20 characters so your review can be published.'); return; }
    const safetyMessage = reviewQualityMessage(value);
    if (safetyMessage) { setStatus(safetyMessage); return; }
    setBusy(true); setStatus('');
    try {
      await addReview(file.id, { userId: user.uid, rating: Number(rating), comment: value });
      const summaryOk = await refreshRatingSummary(file.id);
      setComment(''); setStatus(''); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } }));
    } catch (error) {
      // The published Firestore rules accept exactly this 6-field approved
      // write. A permission-denied here means the updated rules have not been
      // published yet in the Firebase console. The legacy pending-draft shape
      // (fewer fields, status 'pending') cannot satisfy the current rules, so
      // retrying it only produces a confusing error — surface the real cause.
      setStatus(error.code === 'permission-denied'
        ? 'Review could not be saved because the updated Firebase rules have not been published yet. Please publish them from the Firebase console (Firestore Database → Rules).'
        : 'Review could not be saved. Please try again.');
    }
    finally { setBusy(false); }
  };
  const moderate = async (item) => {
    setBusy(true); setStatus('');
    try { await updateReview(file.id, item.id, { status: 'approved', moderatedAt: new Date() }); const summaryOk = await refreshRatingSummary(file.id); setStatus('Earlier pending review published.'); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } })); }
    catch (_) { setStatus('Could not publish this earlier review. Check administrator permissions.'); }
    finally { setBusy(false); }
  };
  const startEdit = (item) => { setEditing(item.id); setEditText(String(item.comment || '')); setEditRating(Number(item.rating || 5)); };
  const saveEdit = async (item) => {
    if (!admin || editText.trim().length < 20 || editText.trim().length > 50000) return;
    setBusy(true); setStatus('');
    try {
      await updateReview(file.id, item.id, { comment: editText.trim(), rating: Number(editRating), editedAt: new Date() });
      const summaryOk = await refreshRatingSummary(file.id);
      setEditing(null); setStatus('Review updated by administrator.'); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } }));
    } catch (_) { setStatus('Could not edit the review. Check administrator permissions.'); }
    finally { setBusy(false); }
  };
  const remove = async (item) => {
    if (!admin) return;
    requestConfirm({
      message: 'Permanently delete this resource review?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setBusy(true); setStatus('');
        try { await deleteReview(file.id, item.id); const summaryOk = await refreshRatingSummary(file.id); setStatus('Review deleted.'); window.dispatchEvent(new CustomEvent('edunexus:file-review-changed', { detail: { fileId: file.id, ratingSummaryUpdated: summaryOk } })); }
        catch (_) { setStatus('Review deletion failed.'); }
        finally { setBusy(false); }
      },
    });
  };
  const reportReview = async (review) => {
    if (!user?.uid || review.id === user.uid || busy || reported[review.id]) return;
    const reason = window.prompt('Report reason: spam, abuse, copyright, personal-data, or other', 'spam');
    if (reason === null) return;
    const value = String(reason || '').trim().toLowerCase();
    if (!['spam','abuse','copyright','personal-data','other'].includes(value)) {
      setStatus('Choose a valid report reason: spam, abuse, copyright, personal-data, or other.'); return;
    }
    setBusy(true); setStatus('');
    try {
      await reportReviewRecord(file.id, review.id, user.uid, value);
      setReported((prev) => ({ ...prev, [review.id]: true }));
      setStatus('Thanks. The review has been reported to the administrator for inspection.');
    } catch (error) {
      setStatus(error.code === 'permission-denied'
        ? 'Reports require the updated Firestore rules. Please use the Contact page until they are published.'
        : 'This report could not be saved. Please try again.');
    } finally { setBusy(false); }
  };
  const inspectReports = async (review) => {
    if (!admin || busy) return;
    setBusy(true); setStatus('');
    try {
      const reports = await listReviewReports(file.id, review.id);
      setReportResults((prev) => ({
        ...prev, [review.id]: reports
      }));
    } catch (_) { setStatus('Review reports could not be loaded. Check deployed Firestore rules.'); }
    finally { setBusy(false); }
  };
  const average = items.length ? (items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length).toFixed(1) : '';
  return <section className="ah-focus" aria-label="Resource reviews">
    <div className="ah-between"><div><span className="ah-eyebrow">Student resource reviews</span><h3>Read and review: {nameOf(file)}</h3></div><span className="ah-chip"><Star size={14} /> {average || 'New'} · {items.length} published</span></div>
    <p>Share your own experience with this study material. User-submitted reviews appear immediately and do not represent an official examination guarantee.</p>
    {status && <div role="status" className="ah-message">{status}</div>}
    {loading ? <p>Loading reviews…</p> : items.length ? <div className="ah-review-list">{items.map((r) => <article className="ah-review" key={r.id}><div className="ah-between"><strong>Student review {r.editedAt ? '· edited by admin' : ''}</strong><span className="ah-stars" aria-label={r.rating + ' out of 5 stars'}>{'★'.repeat(Math.max(0, Math.min(5, r.rating || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, r.rating || 0)))}</span></div><p>{String(r.comment || '')}</p><div className="ah-actions">{user?.uid && user.uid !== r.id && !admin && <button type="button" className="ah-secondary" disabled={busy || reported[r.id]} onClick={() => reportReview(r)}>{reported[r.id] ? 'Reported' : 'Report review'}</button>}{admin && <button type="button" className="ah-secondary" disabled={busy} onClick={() => inspectReports(r)}>Check reports</button>}</div>{admin && reportResults[r.id] && <p className="ah-note" role="status">{reportResults[r.id].length ? reportResults[r.id].length + ' report(s): ' + reportResults[r.id].map((item) => item.reason).join(', ') : 'No reports on this review.'}</p>}{admin && <div className="ah-actions"><button type="button" className="ah-secondary" disabled={busy} onClick={() => startEdit(r)}>Edit</button><button type="button" className="ah-delete" disabled={busy} onClick={() => remove(r)}>Delete</button></div>}{admin && editing === r.id && <div className="ah-review-form"><label>Rating<select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label><label>Review text<textarea rows={6} maxLength={50000} value={editText} onChange={(e) => setEditText(e.target.value)} /></label><div className="ah-actions"><button type="button" className="ah-primary" disabled={busy || editText.trim().length < 20} onClick={() => saveEdit(r)}>Save edit</button><button type="button" className="ah-secondary" onClick={() => setEditing(null)}>Cancel</button></div></div>}</article>)}</div> : <div className="ah-empty">No published reviews yet. Be the first to share thoughtful feedback.</div>}
    {user?.uid ? (mine ? null :
      <form className="ah-review-form" onSubmit={publish}><h4>Share your experience</h4><label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Helpful</option><option value={3}>3 — Average</option><option value={2}>2 — Needs improvement</option><option value={1}>1 — Not helpful</option></select></label><label>Written review<textarea required rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write your review of this file…" /></label><p className="ah-note">Up to 50 words. Reviews publish automatically. Please share genuine feedback, without personal data or active exam content.</p><button type="submit" className="ah-primary" disabled={busy || !comment.trim() || countWords(comment) > 50}>{busy ? 'Publishing…' : 'Publish review'}</button></form>) : <p className="ah-note">Sign in to leave a review.</p>}
    {admin && pending.length > 0 && <div className="ah-review-queue"><h4><ShieldCheck size={17} /> Earlier unpublished reviews ({pending.length})</h4>{pending.map((r) => <article key={r.id} className="ah-review"><strong>{r.rating} / 5 · Student review</strong><p>{String(r.comment || '')}</p><div className="ah-actions"><button type="button" className="ah-primary" disabled={busy} onClick={() => moderate(r)}>Publish earlier review</button><button type="button" className="ah-delete" disabled={busy} onClick={() => remove(r)}>Delete</button></div></article>)}</div>}
    <ConfirmUI />
  </section>;
}

function FileCardRating({ fileId, ratingAverage, ratingCount }) {
  const [score, setScore] = useState(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    // True while the file document carries a fresh denormalized summary, so
    // refreshes can use one cheap document read instead of an aggregation.
    let denormalized = readRatingSummary({ ratingAverage, ratingCount }) !== null;
    if (active) setScore(readRatingSummary({ ratingAverage, ratingCount }));
    const aggregate = async (current) => {
      try {
        // Regular list query (not server aggregation) — the Firestore rules
        // allow public listing of approved reviews, and client-side averaging
        // avoids aggregation permission issues.
        const reviews = await listReviews(fileId, { status: 'approved' });
        let sum = 0, n = 0;
        reviews.forEach((item) => {
          const r = Number(item?.rating);
          if (Number.isFinite(r) && r >= 1 && r <= 5) { sum += r; n++; }
        });
        if (active && current === revision) {
          setScore(n > 0 ? sum / n : null);
        }
      } catch (_) { if (active && current === revision) setScore(null); }
    };
    const refresh = async (mode) => {
      const current = ++revision;
      // 'aggregate' skips the summary entirely: a review just changed without
      // a confirmed metadata rewrite, so the summary may be stale. 'summary'
      // is only requested right after such a rewrite, so the document read is
      // trusted. 'auto' uses the summary only while it is believed fresh.
      if (mode === 'aggregate') denormalized = false;
      if (mode !== 'aggregate' && (mode === 'summary' || denormalized)) {
        try {
          const fileDoc = await getFile(fileId);
          const summary = fileDoc ? readRatingSummary(fileDoc) : null;
          if (summary !== null) {
            denormalized = true;
            if (active && current === revision) setScore(summary);
            return;
          }
        } catch (_) { /* fall through to the aggregation fallback */ }
        denormalized = false;
      }
      await aggregate(current);
    };
    void refresh('auto');
    const onReviewChange = (event) => {
      if (!event.detail?.fileId || event.detail.fileId === fileId) {
        // A confirmed metadata rewrite means the summary is fresh; any other
        // review change means it is stale, so aggregate instead.
        void refresh(event.detail?.ratingSummaryUpdated === true ? 'summary' : 'aggregate');
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh('auto'); };
    window.addEventListener('edunexus:file-review-changed', onReviewChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.removeEventListener('edunexus:file-review-changed', onReviewChange); document.removeEventListener('visibilitychange', onVisible); };
  }, [fileId, ratingAverage, ratingCount]);
  if (score === null) return null;
  const fullStars = Math.max(0, Math.min(5, Math.round(score)));
  const countLabel = Number(ratingCount) > 0 ? ' (' + Number(ratingCount) + ')' : '';
  return <p className="ah-card-rating" aria-label={'Average student rating ' + score.toFixed(1) + ' out of 5 stars' + (countLabel ? ', based on' + countLabel + ' reviews' : '')}>
    <span className="ah-card-stars" aria-hidden="true">{'★'.repeat(fullStars)}{'☆'.repeat(5 - fullStars)}</span><span>{score.toFixed(1)}{countLabel}</span>
  </p>;
}

// Memoized so typing in search, changing filters/sort, or another card's
// download note does not re-render every visible card. The parent passes
// fresh inline callbacks each render, so the comparator only watches the
// data props — all four callbacks are closure-safe (they read stable setters
// and props only, never changing render state).
const copyPreviewLink = (file, setCopied) => {
  const url = window.location.origin + filePreviewLink(file);
  const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
  } else {
    fallbackCopy(url, done);
  }
};
const fallbackCopy = (text, done) => {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta); done();
  } catch (_) { /* clipboard unavailable */ }
};

const ResourceCard = React.memo(function ResourceCard({ file, isAdmin, onDelete, onPreview, onReviews, onDownload, downloadStatus }) {
  const links = fileLinks(file);
  const title = nameOf(file);
  const [copied, setCopied] = useState(false);
  return <article className="ah-resource">
    <div className="ah-file-icon"><FileText size={22} /></div>
    <div className="ah-resource-content"><div className="ah-between ah-file-top"><h3>{title}</h3><span className="ah-chip">{extOf(file)}</span></div>
      <FileCardRating fileId={file.id} ratingAverage={file.ratingAverage} ratingCount={file.ratingCount} />
      <p className="ah-meta">{cut(file.subject, 50) || 'General'}{dateOf(file) ? ' · Added ' + dateOf(file) : ''}</p>
      {file.description && <p className="ah-description">{cut(file.description, 320)}</p>}
      <div className="ah-actions">
        <button type="button" className="ah-secondary" disabled={!links.source} onClick={() => onPreview(file)}><BookOpen size={16} /> Preview</button>
        <button type="button" className="ah-secondary" onClick={() => onReviews(file)}><Star size={16} /> Reviews</button>
        <button type="button" className="ah-secondary" onClick={() => copyPreviewLink(file, setCopied)} title="Copy preview link with this file's title and description"><Link size={16} /> {copied ? 'Copied!' : 'Copy link'}</button>
        {links.source ? <a className="ah-primary" href={links.download} download={links.direct ? safeFileName(file) : undefined} rel="noopener noreferrer" onClick={(e) => onDownload(e, file, links)}>{links.kind === "folder" || links.kind === "external-link" ? <ExternalLink size={16} /> : <Download size={16} />}{links.kind === "folder" ? "Open folder" : links.kind === "external-link" ? "Open resource" : "Download"}</a> : <span className="ah-muted">File link unavailable</span>}
        {isAdmin && <button type="button" className="ah-delete" onClick={() => onDelete(file)} aria-label={'Delete ' + title}>Delete</button>}
      </div>
      {downloadStatus && <p className="ah-note" role="status">{downloadStatus}</p>}
    </div>
  </article>;
}, (prev, next) => prev.file === next.file && prev.isAdmin === next.isAdmin && prev.downloadStatus === next.downloadStatus);

const guidance = [
  { icon: '01', title: 'Build a subject-wise study library', body: 'Start with the course code used in your learning management system and keep lecture notes, handouts, summaries and practice material together. A subject folder provides a predictable place to return to whenever you revise. If a folder currently has no uploaded resources, it remains available so new material can be added without changing how students navigate the library.' },
  { icon: '02', title: 'Read the handouts before attempting practice questions', body: 'Use the course handouts to identify the core definitions, models and worked examples. Turn important headings into short questions and answer them without looking at the source. Compare your response with the handout, correct misunderstandings and repeat the exercise later. This method helps you use downloaded material actively rather than collecting files you never revisit.' },
  { icon: '03', title: 'Combine different resources carefully', body: 'Lecture slides may provide an outline, while reference notes can explain the same idea in more detail. Past-paper reviews and student comments can suggest areas worth revising, but they are not an official syllabus and cannot reliably predict a future examination. Check course announcements and the current handouts when you need authoritative instructions about assessments.' },
  { icon: '04', title: 'Review resources before downloading', body: 'Open the Preview action to inspect a supported document in this page before saving it. Look at its subject code, title, topics, legibility and publication context. If a file looks outdated or unrelated, compare it with the current course material. Student reviews may help you discover useful notes, but their opinions should not replace your own evaluation of a source.' },
  { icon: '05', title: 'Plan small, repeatable revision sessions', body: 'Divide each course into manageable topics and reserve a separate slot for examples, practice and error correction. After a study session, record the topics you can explain independently and the questions that still need attention. Revisit the latter in your next session. A clear sequence of retrieval, feedback and revision is more actionable than one long session of passive reading.' },
  { icon: '06', title: 'Download and organize material responsibly', body: 'Save files under meaningful subject and topic names and avoid creating multiple confusing copies. Check the file type before opening unfamiliar downloads, and keep your browser and document viewer updated. External file hosts may require the uploader to enable sharing or may present a confirmation page for larger downloads. Respect authorship and use resources only where sharing and use are permitted.' },
  { icon: '07', title: 'Contribute constructive resource reviews', body: 'Once you have used a file, describe its clarity, strengths and limitations in a short review. Mention whether examples are understandable and whether material appears aligned with your course. Avoid confidential examination content, spam and private information. Genuine reviews may appear immediately; visitors can report inappropriate submissions for administrator review.' },
  { icon: '08', title: 'Get more from your EduNexus workspace', body: 'Use the Academic Hub for files, the Exam Prep section for curated practice MCQs and completed-paper experiences, and the existing study tools when you need a different way to revise. These features complement one another: a document provides the source, practice checks recall, and your own notes capture what still needs work. There is no need to install a separate browser extension to browse this library.' }
];

export default function AcademicHubPro({ user, isAdmin = false, showToast }) {
  const { requestConfirm, ConfirmUI } = useConfirm();
  const [latest, setLatest] = useState([]);
  const [older, setOlder] = useState([]);
  const [subjectFiles, setSubjectFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderCounts, setFolderCounts] = useState({});
  const [recalcArmed, setRecalcArmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [deepSearching, setDeepSearching] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const cursorRef = useRef(null);
  const fullLoadDone = useRef(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [format, setFormat] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [subjectsExpanded, setSubjectsExpanded] = useState(true);
  const [openGroup, setOpenGroup] = useState(() => new URLSearchParams(window.location.search).get('group') || '');
  const [subject, setSubject] = useState(() => new URLSearchParams(window.location.search).get('subject') || routeParamsFromPath(window.location.pathname).subject || '');
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('file') || '');
  const [panel, setPanel] = useState(() => new URLSearchParams(window.location.search).get('panel') === 'reviews' ? 'reviews' : 'preview');
  const [downloadStatus, setDownloadStatus] = useState({});
  const [visible, setVisible] = useState(18);
  const scroller = useRef(null);
  const latestCursorRef = useRef(null);
  const olderPagesLoaded = useRef(false);

  useEffect(() => {
    const onPop = () => { const params = new URLSearchParams(window.location.search); setSubject(params.get('subject') || routeParamsFromPath(window.location.pathname).subject || ''); setOpenGroup(params.get('group') || ''); setSelectedId(params.get('file') || ''); setPanel(params.get('panel') === 'reviews' ? 'reviews' : 'preview'); };
    window.addEventListener('popstate', onPop);
    let alive = true;
    // First page of the public catalogue (adapter read; realtime only invalidates).
    const refreshLatest = async () => {
      try {
        const { items, cursor: firstCursor, hasMore: morePages } = await listFiles({ limit: PAGE_SIZE });
        if (!alive) return;
        setLatest(items);
        // Follow the live first page until older pages have been requested.
        setCursor((prev) => prev && prev.id !== latestCursorRef.current ? prev : (firstCursor || null));
        latestCursorRef.current = firstCursor?.id || null;
        setHasMore((prev) => prev && olderPagesLoaded.current ? prev : morePages);
        setLoading(false); setError('');
      } catch (e) {
        if (!alive) return;
        setLoading(false);
        setError(e && e.code === 'permission-denied' ? 'The file library is not accessible with the currently deployed Firestore rules.' : 'Could not load files. Please check your connection and try again.');
      }
    };
    const refreshFolders = async () => {
      try {
        const data = (await getMetaDoc('folders')) || {};
        if (!alive) return;
        setFolders(Array.isArray(data.list) ? data.list.filter((v) => typeof v === 'string') : []);
        setFolderCounts(data.fileCounts && typeof data.fileCounts === 'object' ? data.fileCounts : {});
      } catch (_) {}
    };
    refreshLatest();
    refreshFolders();
    const unsubFiles = subscribeFiles({ limit: PAGE_SIZE, onInvalidate: refreshLatest });
    const unsubFolders = subscribeMetaDoc('folders', { onInvalidate: refreshFolders });
    return () => { alive = false; unsubFiles(); unsubFolders(); window.removeEventListener('popstate', onPop); };
  }, []);

  const files = useMemo(() => {
    const map = new Map();
    [...older, ...latest, ...subjectFiles].forEach((f) => map.set(f.id, f));
    return [...map.values()].sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt));
  }, [latest, older, subjectFiles]);
  useEffect(() => {
    if (!selectedId || files.some((f) => f.id === selectedId)) return;
    let alive = true;
    getFile(selectedId).then((fileDoc) => {
      if (alive && fileDoc) setOlder((prev) => [...prev.filter((f) => f.id !== fileDoc.id), fileDoc]);
    }).catch(() => { if (alive) setError('The selected file could not be loaded.'); });
    return () => { alive = false; };
  }, [selectedId, files]);
  const counts = useMemo(() => files.reduce((m, f) => { const key = cut(f.subject, 50); if (key) m[key] = (m[key] || 0) + 1; return m; }, {}), [files]);
  const subjects = useMemo(() => [...new Set([...DEFAULT_SUBJECTS, ...folders, ...Object.keys(counts)].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [folders, counts]);
  // Alias merge (presentation only): one visual folder per course code. Aliases such as
  // "CS101", "CS101_Introduction_to_Computing" and "CS101-Complete-Study-Material-VU"
  // render as a single "CS101" card; its files and counts are the union of all aliases.
  const codeGroups = useMemo(() => {
    const map = new Map();
    subjects.forEach((raw) => {
      const code = extractCourseCode(raw) || raw;
      if (!map.has(code)) map.set(code, { aliases: [], display: code });
      const g = map.get(code);
      if (!g.aliases.includes(raw)) g.aliases.push(raw);
    });
    map.forEach((g, code) => {
      const full = g.aliases.find((a) => new RegExp('^' + code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_[A-Za-z]').test(a));
      g.display = full || [...g.aliases].sort((a, b) => a.length - b.length)[0] || code;
    });
    return map;
  }, [subjects]);
  const mergedCodes = useMemo(() => [...codeGroups.keys()].sort((a, b) => a.localeCompare(b)), [codeGroups]);
  // Resolve any raw alias (e.g. an old ?subject= deep link) to its merged course code.
  const activeCode = useMemo(() => {
    if (!subject) return '';
    if (codeGroups.has(subject)) return subject;
    for (const [code, g] of codeGroups) if (g.aliases.includes(subject)) return code;
    return subject;
  }, [subject, codeGroups]);

  // Fast subject view: when a subject folder is opened (e.g.
  // ?page=academic&subject=CS609_System_Programming), load ALL of that
  // subject's files immediately with a single where-query instead of paging
  // through the global newest-first feed. No orderBy here, so no composite
  // index is required; client-side sort happens in the `files` memo below.
  useEffect(() => {
    if (!activeCode) { setSubjectFiles([]); return; }
    let alive = true;
    const grp = codeGroups.get(activeCode);
    const aliases = (grp ? grp.aliases : [activeCode]).slice(0, 10);
    // NOTE: the adapter always orders by createdAt, so on the Firebase branch
    // this query needs a composite index files(subject, createdAt) — the
    // legacy code deliberately used no orderBy to avoid it. Deploy the index
    // (firestore.indexes.json) or the subject view stays empty on Firebase.
    const refresh = async () => {
      try {
        const { items } = await listFiles({ subjects: aliases.length ? aliases : [activeCode], limit: 400, activeOnly: false });
        if (alive) setSubjectFiles(items);
      } catch (_) {}
    };
    refresh();
    const unsub = subscribeFiles({ subjects: aliases.length ? aliases : [activeCode], limit: 400, onInvalidate: refresh });
    return () => { alive = false; unsub(); };
  }, [activeCode, codeGroups]);
  const activeAliasSet = useMemo(() => new Set(activeCode ? (codeGroups.get(activeCode) ? codeGroups.get(activeCode).aliases : [activeCode]) : []), [activeCode, codeGroups]);
  // True per-card counts: the background full-library loader keeps the live
  // `counts` (from loaded files) complete, so it is the primary truth. The
  // admin "Recalculate folder counts" backfill map is the fallback. We take
  // the max per alias so a stale backfill value can never hide real files.
  // Keys are truncated to 50 chars on both sides (see `cut` usage when the
  // maps are built), so the lookup truncates too.
  const codeFileCount = (code) => {
    const g = codeGroups.get(code);
    const aliases = g ? g.aliases : [code];
    let total = 0;
    aliases.forEach((a) => {
      const key = cut(a, 50);
      total += Math.max(counts[key] || 0, Number(folderCounts[key]) || 0);
    });
    return total;
  };
  // Main folders: group every merged course code under its prefix (CS, MGT, ENG, …).
  const subjectGroups = useMemo(() => {
    const map = new Map();
    mergedCodes.forEach((code) => {
      const p = subjectPrefix(code);
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(code);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [mergedCodes]);
  const normalized = deferredSearch.trim().toLowerCase();
  // Course-aware search. A department prefix such as "cs" intentionally
  // matches every CS course; a complete course code such as "cs101" matches
  // CS101 only (including its folder aliases) and never CS1010/CS101A.
  const normalizedCompact = normalized.replace(/[^a-z0-9]/g, '');
  const courseQuery = normalizedCompact.match(/^([a-z]{2,})(\d{3}[a-z]?)?$/i);
  const searchMatchesFile = useCallback((f) => {
    if (!normalized) return true;
    const subjectCode = extractCourseCode(f.subject || '');
    if (courseQuery) {
      const prefix = courseQuery[1].toUpperCase();
      const exactCode = courseQuery[2] ? (prefix + courseQuery[2].toUpperCase()) : '';
      if (exactCode) return subjectCode === exactCode;
      if (subjectCode && subjectPrefix(subjectCode) === prefix) return true;
    }
    const words = normalized.split(/\s+/).filter(Boolean);
    const haystack = [f.name, f.title, f.subject, f.description, f.ext]
      .map((value) => String(value || '').toLowerCase()).join(' ');
    return words.every((word) => haystack.includes(word));
  }, [normalized, normalizedCompact]);
  const matches = useMemo(() => {
    const result = files.filter((f) => f.isActive !== false
      && (!activeCode || activeAliasSet.has(f.subject))
      && (format === 'all' || (format === 'documents' ? ['PDF','DOC','DOCX','PPT','PPTX','XLS','XLSX','TXT','CSV'].includes(extOf(f)) : format === 'images' ? ['PNG','JPG','JPEG','WEBP'].includes(extOf(f)) : extOf(f) === 'LINK'))
      && searchMatchesFile(f));
    if (sortBy === 'name') result.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    else if (sortBy === 'oldest') result.reverse();
    return result;
  }, [files, activeCode, activeAliasSet, format, searchMatchesFile, sortBy]);
  // A selected subject shows its files immediately and completely — no
  // manual "load more" needed. The unfiltered view keeps client-side paging.
  const displayed = activeCode ? matches : matches.slice(0, visible);
  // Smart search: whatever the user types, surface the matching subject(s) as
  // one-tap chips. Opening a subject loads its files server-side (up to 400),
  // so a search always finds the subject even when its files are not in the
  // locally loaded batch.
  const searchSuggestions = useMemo(() => {
    const q = normalized;
    if (!q || activeCode) return [];
    const compact = q.replace(/[^a-z0-9]/g, '');
    const typedCourse = compact.match(/^([a-z]{2,})(\d{3}[a-z]?)?$/i);
    let candidates = mergedCodes;
    if (typedCourse) {
      const prefix = typedCourse[1].toUpperCase();
      const exact = typedCourse[2] ? prefix + typedCourse[2].toUpperCase() : '';
      candidates = exact
        ? mergedCodes.filter((c) => c.toUpperCase() === exact)
        : mergedCodes.filter((c) => subjectPrefix(c).toUpperCase() === prefix);
    } else {
      candidates = mergedCodes.filter((c) => {
        const label = String((codeGroups.get(c) || {}).display || c).toLowerCase();
        return q.split(/\s+/).filter(Boolean).every((word) => label.includes(word));
      });
    }
    return candidates.slice(0, 50).map((code) => {
      const g = codeGroups.get(code);
      return { code, label: displayFolderName(g?.display || code), count: codeFileCount(code) };
    });
  }, [normalized, activeCode, codeGroups, mergedCodes]);
  const selected = files.find((f) => f.id === selectedId);
  // Hide the floating promo orbs while the preview panel is open so they
  // never overlap the PDF viewer (proper layout on mobile).
  useEffect(() => {
    document.body.classList.toggle('ah-preview-open', !!selected);
    return () => document.body.classList.remove('ah-preview-open');
  }, [selected]);
  useEffect(() => { if (selectedId && scroller.current) scroller.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [selectedId]);
  const openSubject = (value) => {
    setSubject(value); setVisible(18); setSelectedId('');
    if (value) setSubjectsExpanded(false);
    setOpenGroup('');
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('subject', value); else url.searchParams.delete('subject');
    url.searchParams.delete('group');
    url.searchParams.delete('file'); url.searchParams.delete('panel');
    url.searchParams.set('page', 'academic');
    window.history.pushState({ page: 'academic', subject: value }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  // Main-folder navigation: CS -> shows CS101, CS201, … ; '' -> all main folders.
  const openGroupView = (prefix) => {
    setOpenGroup(prefix); setSubject(''); setVisible(18); setSelectedId(''); setSubjectsExpanded(true);
    const url = new URL(window.location.href);
    if (prefix) url.searchParams.set('group', prefix); else url.searchParams.delete('group');
    url.searchParams.delete('subject'); url.searchParams.delete('file'); url.searchParams.delete('panel');
    url.searchParams.set('page', 'academic');
    window.history.pushState({ page: 'academic', group: prefix }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  // "Back to subjects" from a subject file view returns to its main folder.
  const backToSubjects = () => {
    const g = activeCode ? subjectPrefix(activeCode) : '';
    setSubject(''); setVisible(18); setSelectedId(''); setSubjectsExpanded(true); setOpenGroup(g);
    const url = new URL(window.location.href);
    url.searchParams.delete('subject'); url.searchParams.delete('file'); url.searchParams.delete('panel');
    if (g) url.searchParams.set('group', g); else url.searchParams.delete('group');
    url.searchParams.set('page', 'academic');
    window.history.pushState({ page: 'academic', group: g }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  const openPanel = (file, nextPanel) => {
    setSelectedId(file.id); setPanel(nextPanel);
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'academic');
    url.searchParams.set('file', file.id);
    url.searchParams.set('panel', nextPanel);
    window.history.pushState({ page: 'academic', file: file.id }, '', url.pathname + url.search);
    window.dispatchEvent(new Event('edunexus:navigation'));
  };
  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const page = await listFiles({ limit: PAGE_SIZE, cursor });
      olderPagesLoaded.current = true;
      setOlder((prev) => [...prev, ...page.items]);
      if (page.cursor) setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (_) { setError('Could not load more resources. Please retry.'); }
    finally { setLoadingMore(false); }
  };
  // Live mirror of the pagination cursor for the manual "Load more" pager.
  useEffect(() => { cursorRef.current = cursor; });
  // NOTE (2026-09-28, quota hotfix): the background full-library loader was
  // removed. It paged through the ENTIRE files collection on every visit
  // (~500 Firestore reads/visit) and pushed the project over the Spark
  // free-tier quota. Folder counts come from the denormalized
  // meta/folders.fileCounts map; search filters the loaded batch and the
  // user can "Load more resources" for deeper results. Server-side search
  // arrives with the Supabase migration (Postgres FTS).
  const del = async (file) => {
    if (!isAdmin) return;
    requestConfirm({
      message: 'Delete this file record from the Academic Hub?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          const subjKey = cut(file.subject, 50);
          await deleteFile(file.id);
          if (subjKey) {
            try { await bumpFolderCount(subjKey, -1); } catch (_) {}
          }
          setOlder((prev) => prev.filter((f) => f.id !== file.id));
          setLatest((prev) => prev.filter((f) => f.id !== file.id));
          // Functional update: the memoized ResourceCard may hold an older
          // onDelete closure, so never read selectedId from the closure here.
          setSelectedId((prev) => (prev === file.id ? '' : prev));
          if (showToast) showToast('File record deleted.', 'info');
        } catch (_) { if (showToast) showToast('File deletion failed.', 'error'); }
      },
    });
  };
  const download = (event, file, links) => {
    if (!links.source) { event.preventDefault(); return; }
    const note = file.sourceType === 'supabase-storage' ? 'Your file download is being prepared. Please check browser download permissions if it does not start.' : file.sourceType === 'firebase-storage' ? 'Downloading the uploaded file. If it does not start, check browser download permissions.' : links.direct ? 'Download requested. The file host may still require sharing permission or confirmation.' : 'Opening the file host. This host may display the file rather than download it directly.';
    setDownloadStatus((prev) => ({ ...prev, [file.id]: note }));
  };

  return <div className="ah-root">
    <section className="ah-hero"><div><span className="ah-eyebrow ah-hero-kicker"><GraduationCap size={15} /> EduNexus Learning Library</span><h1>Academic Hub</h1><p className="ah-hero-lead">Your organized space for course handouts, lecture notes, study guides and carefully selected revision material. Explore a subject, preview supported resources, download files, and read or submit resource reviews without leaving your learning workspace.</p><div className="ah-hero-links"><a href="#academic-library">Explore the library <ArrowRight size={17} /></a><a href="#academic-study-guide">Study smarter <BookOpen size={17} /></a></div></div><div className="ah-hero-graphic" aria-hidden="true"><FolderOpen size={76} /><span>Learn · Practice · Review</span></div></section>

    <section className="ah-intro" aria-label="About the Academic Hub"><div className="ah-section-heading"><span className="ah-eyebrow">One library · multiple ways to learn</span><h2>Find the right material for your next study session</h2></div><p>The Academic Hub brings EduNexus resources into a subject-first experience. Instead of opening many folders and unrelated websites, begin with a course code and work through the available materials in one place. Each file card provides its title, subject and available viewing options, while the review panel gives students room to share useful feedback about a specific resource.</p><p>New uploads appear in the library as they become available. The page initially loads a manageable batch for faster rendering and lets you bring in additional files as needed. Counts shown on each folder reflect the full library, with related folders merged under one course code. Use the existing administrator upload tools to keep adding folders, documents and links without changing the original storage system.</p></section>

    <section className="ah-intro" aria-label="Original subject study guides"><div className="ah-section-heading"><span className="ah-eyebrow">Learn before downloading</span><h2>Original subject explanations and worked examples</h2></div><p>Read an independently written explanation before choosing a PDF. These guides cover general course concepts; verify current syllabus and assignment requirements with your institution.</p><div className="ah-actions">{EDITORIAL_GUIDES.map(([code,label,slug]) => <a className="ah-secondary" key={code} href={'/learning/' + code.toLowerCase() + '/' + slug}>{label} <ArrowRight size={15} /></a>)}</div></section>

    {reviewIsAdmin(user, isAdmin) && <React.Suspense fallback={<p className="ah-note" role="status">Opening secure upload workspace…</p>}><AcademicAdminUploader user={user} subjects={subjects} initialSubject={activeCode || subject} onUploaded={(code) => { setSearch(''); setFormat('all'); openSubject(code); }} /></React.Suspense>}

    {reviewIsAdmin(user, isAdmin) && <div className="ah-admin-tools" style={{margin:'12px 0'}}><button type="button" className="ah-secondary" onClick={async () => {
      if (!recalcArmed) { setRecalcArmed(true); if (showToast) showToast('Click "Recalculate folder counts" again to confirm. This reads all file records once.', 'info'); return; }
      setRecalcArmed(false);
      try {
        // Full-library scan for the one-time backfill (the adapter has no
        // unbounded iterator, so this reads one large page; the library is
        // in the hundreds of files).
        const { items } = await listFiles({ limit: 10000, activeOnly: false });
        const counts = {};
        items.forEach((f) => { const k = cut(f.subject, 50); if (k) counts[k] = (counts[k] || 0) + 1; });
        await setMetaDoc('folders', { fileCounts: counts });
        if (showToast) showToast('Folder counts recalculated: ' + items.length + ' files across ' + Object.keys(counts).length + ' folders.', 'success');
      } catch (e) { if (showToast) showToast('Count recalculation failed: ' + (e?.message || 'error'), 'error'); }
    }}><FolderOpen size={16} /> {recalcArmed ? 'Click again to confirm recalculation' : 'Recalculate folder counts'}</button></div>}

    <section id="academic-library" className="ah-library" aria-label="Academic resources"><div className="ah-section-heading"><span className="ah-eyebrow">Browse, preview & download</span><h2>Subject resource library</h2><p>Choose a subject, search the loaded resources and open a file directly in the page when preview is supported.</p></div>
      <div className="ah-stats"><div><strong>{subjectGroups.length}</strong><span>Main folders</span></div><div><strong>{mergedCodes.reduce((n, c) => n + codeFileCount(c), 0)}</strong><span>Total resources</span></div><div><strong>{files.length}</strong><span>Loaded for browsing</span></div></div>
      <div className="ah-toolbar"><label className="ah-search"><Search size={19} /><span className="ah-visually-hidden">Search resources</span><input value={search} onChange={(e) => { setSearch(e.target.value); setVisible(18); }} placeholder="Search file title, subject, topic or format…" aria-label="Search resources" />{search && <button type="button" className="ah-clear" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}</label><button type="button" className="ah-secondary" onClick={() => { setSearch(''); setFormat('all'); openSubject(''); setSubjectsExpanded(true); }}><FolderOpen size={17} /> All subjects</button></div>
      <div className="ah-filterbar" aria-label="Filter and sort study files"><label>File type <select value={format} onChange={(e) => { setFormat(e.target.value); setVisible(18); }}><option value="all">All formats</option><option value="documents">Documents</option><option value="images">Images</option><option value="links">Other links</option></select></label><label>Sort by <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setVisible(18); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">File name A–Z</option></select></label><button type="button" className="ah-secondary" aria-expanded={subjectsExpanded} onClick={() => setSubjectsExpanded((v) => !v)}><FolderOpen size={16} /> {subjectsExpanded ? 'Hide folders' : 'Browse folders'}</button></div>
      {deepSearching && normalized && <p className="ah-deepsearch" role="status"><span className="ah-spin" aria-hidden="true" /> Searching the entire library… {files.length} files scanned so far</p>}
    {selected && <div className="ah-panel-wrap" ref={scroller}><div className="ah-panel-tabs" role="group" aria-label="Selected file tools"><button type="button" className={panel === 'preview' ? 'active' : ''} onClick={() => setPanel('preview')}><BookOpen size={16} /> Preview</button><button type="button" className={panel === 'reviews' ? 'active' : ''} onClick={() => setPanel('reviews')}><Star size={16} /> Reviews</button><button type="button" onClick={() => setSelectedId('')}><X size={16} /> Close</button></div>{panel === 'preview' ? <ResourcePreview file={selected} links={fileLinks(selected)} onClose={() => setSelectedId('')} /> : <FileReviews file={selected} user={user} isAdmin={isAdmin} />}</div>}
      {error && <p className="ah-message" role="alert">{error}</p>}
      {loading ? <div className="ah-loading" role="status"><div /><div /><div /><p>Loading academic resources…</p></div> :
        <>{subjectsExpanded && !subject && !normalized && (openGroup ? <div aria-label={openGroup + ' subject folders'}><div className="ah-crumb"><button type="button" className="ah-secondary" onClick={() => openGroupView('')}><ArrowLeft size={15} /> All folders</button><span className="ah-crumb-sep" aria-hidden="true">/</span><strong>{openGroup}</strong></div><div className="ah-subject-grid" aria-label={openGroup + ' subjects'}>{(subjectGroups.find(([p]) => p === openGroup) || ['', []])[1].map((code) => <button key={code} type="button" className="ah-subject" onClick={() => openSubject(code)}><span className="ah-subject-icon"><BookOpen size={19} /></span><span><strong>{displayFolderName((codeGroups.get(code) || {}).display || code)}</strong><small>{(() => { const total = codeFileCount(code); return total + (total === 1 ? ' file' : ' files'); })()}</small></span><ArrowRight size={16} /></button>)}</div></div> : <div className="ah-group-grid" aria-label="Main subject folders">{subjectGroups.map(([prefix, codes]) => { const totalFiles = codes.reduce((n, c) => n + codeFileCount(c), 0); return <button key={prefix} type="button" className="ah-group" onClick={() => openGroupView(prefix)}><span className="ah-group-icon"><Folder size={22} /></span><span><strong>{prefix}</strong><small>{codes.length + (codes.length === 1 ? ' subject' : ' subjects') + ' · ' + totalFiles + (totalFiles === 1 ? ' file' : ' files')}</small></span><ArrowRight size={16} /></button>; })}</div>)}
          {normalized && !subject && searchSuggestions.length > 0 && <div className="ah-subject-grid ah-search-subjects" aria-label="Subjects matching search">{searchSuggestions.map((item) => <button key={item.code} type="button" className="ah-subject" onClick={() => openSubject(item.code)}><span className="ah-subject-icon"><BookOpen size={19} /></span><span><strong>{item.label}</strong><small>{item.count + (item.count === 1 ? ' file' : ' files')}</small></span><ArrowRight size={16} /></button>)}</div>}
          {searchSuggestions.length > 0 && <div className="ah-suggest" role="group" aria-label="Matching subjects"><span className="ah-suggest-label">Subjects found:</span>{searchSuggestions.map((s) => <button key={s.code} type="button" className="ah-suggest-chip" onClick={() => openSubject(s.code)}><BookOpen size={15} /> {s.label} · {s.count + (s.count === 1 ? ' file' : ' files')} <ArrowRight size={14} /></button>)}</div>}
          <div className="ah-results-head"><div><span className="ah-eyebrow">{activeCode ? 'Selected subject' : 'Resource collection'}</span><h3>{(activeCode && displayFolderName((codeGroups.get(activeCode) || {}).display || activeCode)) || 'All available subjects'}</h3><p>{normalized ? (deepSearching ? 'Scanning the entire library for "' + search.trim() + '"…' : 'Results for "' + search.trim() + '" — ' + files.length + ' loaded files scanned (use "Load more resources" for deeper results)') : 'Showing ' + displayed.length + ' of ' + matches.length + ' matching loaded resources'}</p></div>{activeCode && <button className="ah-secondary" type="button" onClick={backToSubjects}><ArrowLeft size={16} /> Back to subjects</button>}</div>
          {displayed.length ? <div className="ah-resource-grid">{displayed.map((file) => <ResourceCard key={file.id} file={file} isAdmin={isAdmin} onDelete={del} onPreview={(f) => openPanel(f, 'preview')} onReviews={(f) => openPanel(f, 'reviews')} onDownload={download} downloadStatus={downloadStatus[file.id]} />)}</div> : <div className="ah-empty"><FileArchive size={30} />{normalized ? (deepSearching ? <><h3>Searching the entire library…</h3><p>{'Scanning every uploaded file for "' + search.trim() + '". Results appear automatically — no need to load more by hand.'}</p></> : <><h3>{'No files found for "' + search.trim() + '"'}</h3><p>The whole library was searched. Try different keywords, a subject chip above, or browse the folders.</p><button className="ah-secondary" type="button" onClick={() => setSearch('')}>Clear search</button></>) : <><h3>No matching files in this loaded batch</h3><p>Try a subject chip above, another search, or load more resources. You can also check the existing Academic Hub administrator tools for new uploads.</p>{hasMore && !deepSearching && !bgLoading && <button className="ah-primary" type="button" disabled={loadingMore} onClick={more}>{loadingMore ? 'Loading more files…' : 'Load more resources'}</button>}</>}</div>}
          {matches.length > displayed.length && <button className="ah-secondary ah-load" type="button" onClick={() => setVisible((n) => n + 18)}>Show more matching files <ArrowRight size={16} /></button>}
          {hasMore && !deepSearching && !bgLoading && <button className="ah-primary ah-load" type="button" disabled={loadingMore} onClick={more}>{loadingMore ? 'Loading more files…' : 'Load next ' + PAGE_SIZE + ' resources'} <ArrowRight size={16} /></button>}
        </>}
    </section>



    <section className="ah-guide" id="academic-study-guide"><div className="ah-section-heading"><span className="ah-eyebrow">Detailed learning guidance</span><h2>Turn study resources into a practical learning routine</h2><p>A well-organized collection is useful when every document has a purpose. These suggestions explain how to choose, evaluate and revisit academic material throughout your semester.</p></div><div className="ah-guidance-grid">{guidance.map((g) => <article className="ah-guidance" key={g.icon}><span className="ah-step">{g.icon}</span><h3>{g.title}</h3><p>{g.body}</p></article>)}</div></section>

    <section className="ah-outro"><div><span className="ah-eyebrow">Continue your learning</span><h2>Your next step is one useful resource away</h2><p>Select a subject, open a resource, record the concepts you need to revise and practice explaining them in your own words. Return to this hub for more files or use the existing exam-preparation tools for additional practice.</p></div><a href="/?page=exam-prep">Go to Exam Prep <ArrowRight size={17} /></a></section>
    <p className="ah-disclaimer">EduNexus is an independent student resource platform, not an official Virtual University service. Materials and student opinions may be incomplete or outdated; verify current course requirements with your institution. External file hosts control access and final download behavior.</p>
    <ConfirmUI />
  </div>;
}
