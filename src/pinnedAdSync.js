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

// The Muse-hosted tutorial video expired (HTTP 404 since 2026-09-29).
// Any pinned ad still pointing at it is transparently served from the
// self-hosted copy at /pinned-ad-video.mp4 until the admin updates the URL
// in Admin -> Pinned Ads. Matches the exact dead URL only, so future admin
// URLs are never affected.
export const LEGACY_DEAD_VIDEO_URL =
  "https://muse.ai/files/1398753889980931/1700667110999272/uw8t07qjugukwny3pekh6efm/edunexus-tutorial-no-intro.mp4";
export const SELF_HOSTED_VIDEO_URL = "/pinned-ad-video.mp4";

export function resolveVideoUrl(url) {
  if (typeof url === "string" && url.trim() === LEGACY_DEAD_VIDEO_URL) {
    return SELF_HOSTED_VIDEO_URL;
  }
  return url;
}
