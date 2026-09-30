import React, { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Pin, X, Maximize2 } from "lucide-react";
import { db } from "./firebase-client";
import {
  PINNED_AD_VERSION_KEY,
  PINNED_AD_CHANGED_EVENT,
  readPinnedAdVersion,
} from "./pinnedAdSync";
import "./pinned-ad.css";

// PinnedAd v2.1.0 — floating pinned announcement.
//
// The player floats OVER the dashboard content (position:fixed) so it never
// takes its own layout space or pushes content down. Tapping it opens an
// expanded overlay with full controls. Size, position and media type are all
// set from the admin panel (Admin → Pinned Ads).
//
// Data: reads Firestore directly — the same collection the admin panel
// reads/writes — so the dashboard always agrees with Admin → Pinned Ads.
// Results are cached 1 hour in localStorage (key v3), and the admin panel
// bumps a version signal after every change so open dashboard tabs refetch
// immediately instead of waiting out the cache.

const PINNED_ADS = collection(db, "artifacts/edunexus-live/public/data/pinned_ads");

const SIZE_CLASS = {
  small: "edx-pa-size-small",
  medium: "edx-pa-size-medium",
  large: "edx-pa-size-large",
};

const POSITION_CLASS = {
  "top-left": "edx-pa-pos-top-left",
  "top-center": "edx-pa-pos-top-center",
  "top-right": "edx-pa-pos-top-right",
  "middle-left": "edx-pa-pos-middle-left",
  center: "edx-pa-pos-center",
  "middle-right": "edx-pa-pos-middle-right",
  "bottom-left": "edx-pa-pos-bottom-left",
  "bottom-center": "edx-pa-pos-bottom-center",
  "bottom-right": "edx-pa-pos-bottom-right",
};

const CACHE_KEY = "edx-pinned-ad-cache-v3";
const CACHE_TTL = 3600000; // 1 hour

function toMs(v) {
  if (!v) return null;
  if (typeof v === "object") {
    if (typeof v.toMillis === "function") return v.toMillis();
    // Firestore Timestamps lose their prototype through the JSON cache
    // round-trip and come back as plain {seconds, nanoseconds} objects.
    if (typeof v.seconds === "number") {
      return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    }
  }
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function mediaTypeOf(ad) {
  if (ad.mediaType === "image" || ad.mediaType === "text") return ad.mediaType;
  return "video";
}

async function fetchActiveAd() {
  const snap = await getDocs(query(PINNED_ADS, orderBy("createdAt", "desc")));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const now = Date.now();
  return (
    items.find((item) => {
      if (item.isActive === false) return false;
      const start = toMs(item.startAt);
      if (start !== null && now < start) return false;
      const end = toMs(item.endAt);
      if (end !== null && now > end) return false;
      return true;
    }) || null
  );
}

export default function PinnedAd() {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Last admin-change version we have already applied.
  const versionRef = useRef(null);

  // Quota-friendly: one-time fetch, cached 1 hour in localStorage.
  // Cache key v3 — v2 was shared between the interim Supabase-backed build
  // and this Firestore build, so v2 could hold a stale null payload.
  const loadAd = useCallback(async (force) => {
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          versionRef.current = cached.v ?? readPinnedAdVersion();
          setAd(cached.ad || null);
          return;
        }
      } catch (_) {}
    }
    try {
      const active = await fetchActiveAd();
      versionRef.current = readPinnedAdVersion();
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), ad: active, v: versionRef.current })
        );
      } catch (_) {}
      setAd(active);
    } catch (_) {
      setAd(null);
    }
  }, []);

  useEffect(() => {
    loadAd(false);
    // Admin bumps this signal after every pinned-ad mutation (create /
    // update / delete / toggle). Two channels: the custom event covers the
    // same tab (storage events never fire in the writing tab), the storage
    // event covers other open tabs, and the visibility check is a backup
    // for browsers that throttle background tabs.
    const onChanged = () => loadAd(true);
    const onStorage = (e) => {
      if (e.key === PINNED_AD_VERSION_KEY) loadAd(true);
    };
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        readPinnedAdVersion() !== versionRef.current
      ) {
        loadAd(true);
      }
    };
    window.addEventListener(PINNED_AD_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(PINNED_AD_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadAd]);

  useEffect(() => {
    setDismissed(false);
    setExpanded(false);
  }, [ad?.id]);

  // Lock body scroll + Escape-to-close while the expanded overlay is open.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  if (!ad || dismissed) return null;

  const type = mediaTypeOf(ad);
  const sizeCls = SIZE_CLASS[ad.size] || SIZE_CLASS.medium;
  const posCls = POSITION_CLASS[ad.position] || POSITION_CLASS["bottom-left"];

  const renderMedia = (withControls) => {
    if (type === "image" && ad.imageUrl) {
      return (
        <img
          className="edx-pa-media"
          src={ad.imageUrl}
          alt={ad.title || "Pinned announcement"}
          loading="lazy"
        />
      );
    }
    if (type === "text") {
      return (
        <div className="edx-pa-textonly">
          {ad.title && <h3 className="edx-pa-title">{ad.title}</h3>}
          {ad.description && <p className="edx-pa-desc">{ad.description}</p>}
          {!ad.title && !ad.description && (
            <p className="edx-pa-desc">Pinned announcement</p>
          )}
        </div>
      );
    }
    return (
      <video
        className="edx-pa-media"
        src={ad.videoUrl}
        poster={ad.thumbnailUrl || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        {...(withControls ? { controls: true } : {})}
      />
    );
  };

  const showCaption = type !== "text" && (ad.title || ad.description);

  return (
    <>
      <div
        className={`edx-pa-float ${sizeCls} ${posCls}`}
        role="complementary"
        aria-label="Pinned announcement"
      >
        <div className="edx-pa-card" onClick={() => setExpanded(true)}>
          <div className="edx-pa-badge">
            <Pin size={12} aria-hidden="true" />
            <span>Pinned</span>
          </div>
          <button
            type="button"
            className="edx-pa-expand"
            aria-label="Expand announcement"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            <Maximize2 size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="edx-pa-dismiss"
            aria-label="Dismiss announcement"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
          >
            ×
          </button>
          <div className="edx-pa-mediawrap">{renderMedia(false)}</div>
          {showCaption && (
            <div className="edx-pa-caption">
              {ad.title && <h4 className="edx-pa-caption-title">{ad.title}</h4>}
              {ad.description && <p className="edx-pa-caption-desc">{ad.description}</p>}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="edx-pa-overlay" onClick={() => setExpanded(false)}>
          <div className="edx-pa-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="edx-pa-close"
              aria-label="Close announcement"
              onClick={() => setExpanded(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="edx-pa-modal-media">{renderMedia(true)}</div>
            {(ad.title || ad.description) && (
              <div className="edx-pa-modal-text">
                {ad.title && <h3 className="edx-pa-modal-title">{ad.title}</h3>}
                {ad.description && <p className="edx-pa-modal-desc">{ad.description}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
