// pinnedAdSync — tiny cross-tab / same-tab signal for pinned ads.
//
// The admin panel (AdminPinnedAds) calls bumpPinnedAdVersion() after every
// successful create / update / delete / toggle. The dashboard player
// (PinnedAd) listens for the signal and refetches immediately instead of
// waiting out its 1-hour localStorage cache.
//
// Two channels are used so every layout works:
//   1. localStorage version key -> "storage" events reach OTHER tabs.
//   2. Custom window event        -> reaches the SAME tab (storage events
//      intentionally do not fire in the tab that wrote the value).

export const PINNED_AD_VERSION_KEY = "edx-pinned-ad-version";
export const PINNED_AD_CHANGED_EVENT = "edx-pinned-ad-changed";

export function readPinnedAdVersion() {
  try {
    return localStorage.getItem(PINNED_AD_VERSION_KEY);
  } catch (_) {
    return null;
  }
}

export function bumpPinnedAdVersion() {
  try {
    localStorage.setItem(PINNED_AD_VERSION_KEY, String(Date.now()));
  } catch (_) {}
  try {
    window.dispatchEvent(new CustomEvent(PINNED_AD_CHANGED_EVENT));
  } catch (_) {}
}
