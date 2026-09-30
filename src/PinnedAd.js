import React, { useEffect, useState } from "react";
import { Pin, X, Maximize2 } from "lucide-react";
import { getActiveAd } from "./db/pinnedAds";
import "./pinned-ad.css";

// PinnedAd v2.0.0 — floating pinned announcement.
//
// The player floats OVER the dashboard content (position:fixed) so it never
// takes its own layout space or pushes content down. Tapping it opens an
// expanded overlay with full controls. Size, position and media type are all
// set from the admin panel (Admin → Pinned Ads).
//
// Data: Supabase-primary via the pinnedAds adapter (same source as the admin
// panel), Firebase as fallback. Results are cached 1 hour in localStorage.

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

function mediaTypeOf(ad) {
  if (ad.mediaType === "image" || ad.mediaType === "text") return ad.mediaType;
  return "video";
}

export default function PinnedAd() {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Quota-friendly: one-time fetch, cached 1 hour in localStorage.
    // Cache key v2 — v1 cached the old Firestore-direct payload shape.
    const CACHE_KEY = "edx-pinned-ad-cache-v2";
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.ts < 3600000) {
        setAd(cached.ad || null);
        return;
      }
    } catch (_) {}
    (async () => {
      try {
        const active = await getActiveAd();
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), ad: active || null }));
        } catch (_) {}
        setAd(active || null);
      } catch (_) {
        setAd(null);
      }
    })();
  }, []);

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
