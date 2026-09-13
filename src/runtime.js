// Runtime resilience + lightweight client session.
// This module executes before App.js and protects the existing localStorage cache
// without changing the app's existing data model.
(function installEduNexusRuntime() {
  if (typeof window === 'undefined') return;

  const storage = window.localStorage;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const ARTICLE_KEY = 'edunexus_articles';
  const MAX_ARTICLE_CACHE = 700 * 1024;

  const compactArticles = (raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return raw;
      let items = parsed.slice(0, 12);
      let result = JSON.stringify(items);
      if (result.length <= MAX_ARTICLE_CACHE) return result;

      // Cache is only a speed layer; keep useful lightweight fields if articles
      // contain large HTML/base64/image payloads.
      items = items.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const copy = { ...item };
        ['content', 'body', 'html', 'base64', 'data'].forEach((key) => {
          if (typeof copy[key] === 'string' && copy[key].length > 12000) delete copy[key];
        });
        return copy;
      });
      result = JSON.stringify(items);
      while (result.length > MAX_ARTICLE_CACHE && items.length > 1) {
        items = items.slice(0, -1);
        result = JSON.stringify(items);
      }
      return result;
    } catch {
      return raw;
    }
  };

  // Prevent QuotaExceededError from breaking the Articles page.
  if (!Storage.prototype.__edunexusSafeSetItem) {
    const safeSetItem = function (key, value) {
      let nextValue = value;
      if (this === storage && key === ARTICLE_KEY) {
        nextValue = compactArticles(value);
      }
      try {
        return nativeSetItem.call(this, key, nextValue);
      } catch (error) {
        if (this === storage && key === ARTICLE_KEY) {
          try { nativeRemoveItem.call(storage, ARTICLE_KEY); } catch {}
          try { return nativeSetItem.call(storage, key, nextValue); } catch {}
          return;
        }
        throw error;
      }
    };
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      writable: true,
      value: safeSetItem,
    });
    Object.defineProperty(Storage.prototype, '__edunexusSafeSetItem', {
      configurable: false,
      value: true,
    });
  }

  // Functional session: sessionStorage + a short-lived SameSite cookie.
  const SESSION_KEY = 'edunexus_session';
  let sessionId = null;
  try { sessionId = window.sessionStorage.getItem(SESSION_KEY); } catch {}
  if (!sessionId) {
    sessionId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try { window.sessionStorage.setItem(SESSION_KEY, sessionId); } catch {}
  }
  try {
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(sessionId)}; Max-Age=86400; Path=/; SameSite=Lax`;
  } catch {}

  // Persist only non-sensitive UI preferences in a small functional cookie.
  try {
    const theme = storage.getItem('theme');
    if (theme === 'dark' || theme === 'light') {
      document.cookie = `edunexus_theme=${theme}; Max-Age=31536000; Path=/; SameSite=Lax`;
    }
  } catch {}

  // Hint the browser to keep the app responsive while loading the UI.
  try {
    if ('connection' in navigator && navigator.connection.saveData) {
      document.documentElement.dataset.saveData = 'true';
    }
  } catch {}
})();

export {};
