// Reject host-substring tricks and untrusted paths before creating an embed.
const WATCH_HOSTS = new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com']);
const SHORT_HOSTS = new Set(['youtu.be','www.youtu.be']);
const ID = /^[A-Za-z0-9_-]{11}$/;

export function safeYouTubeId(value) {
  return typeof value === 'string' && ID.test(value) ? value : '';
}

export function youtubeId(value) {
  if (typeof value !== 'string') return '';
  let url;
  try { url = new URL(value); } catch { return ''; }
  if (url.protocol !== 'https:' || url.username || url.password) return '';
  if (SHORT_HOSTS.has(url.hostname)) return safeYouTubeId(url.pathname.slice(1));
  if (!WATCH_HOSTS.has(url.hostname)) return '';
  if (url.pathname === '/watch') return safeYouTubeId(url.searchParams.get('v'));
  const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
  return match ? match[1] : '';
}
