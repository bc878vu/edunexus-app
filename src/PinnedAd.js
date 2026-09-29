import React, { useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { getActiveAd, subscribePinnedAds } from "./db/pinnedAds";
import "./pinned-ad.css";

// PinnedAd v1.0.1 — dashboard video announcement (redeploy trigger)

/**
 * PinnedAd — pinned video announcement shown at the top of the main dashboard.
 *
 * Shows the currently active ad: isActive=true and current time within
 * startAt/endAt (either bound may be empty = no limit). If multiple qualify,
 * the most recently created one wins. Renders nothing when no ad qualifies,
 * so the dashboard never breaks.
 */
export default function PinnedAd() {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const next = await getActiveAd();
        if (alive) setAd(next);
      } catch (_) {
        if (alive) setAd(null);
      }
    };
    void load();
    const onAdminChange = () => void load();
    window.addEventListener("edunexus:pinned-ads-changed", onAdminChange);
    let unsubscribe = () => {};
    try {
      const maybe = subscribePinnedAds({ onInvalidate: () => void load() });
      if (typeof maybe === "function") unsubscribe = maybe;
    } catch (_) {}
    return () => {
      alive = false;
      window.removeEventListener("edunexus:pinned-ads-changed", onAdminChange);
      try { unsubscribe(); } catch (_) {}
    };
  }, []);

  useEffect(() => { setDismissed(false); }, [ad?.id]);

  if (!ad || dismissed) return null;

  return (
    <section className="edx-pinned-ad" aria-label="Pinned announcement">
      <div className="edx-pinned-ad-inner">
        <div className="edx-pinned-ad-badge">
          <Pin size={13} aria-hidden="true" />
          <span>Pinned</span>
        </div>
        <button
          type="button"
          className="edx-pinned-ad-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
        >
          ×
        </button>
        <div className="edx-pinned-ad-video-wrap">
          <video
            className="edx-pinned-ad-video"
            src={ad.videoUrl}
            poster={ad.thumbnailUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        </div>
        {(ad.title || ad.description) && (
          <div className="edx-pinned-ad-text">
            {ad.title && <h3 className="edx-pinned-ad-title">{ad.title}</h3>}
            {ad.description && <p className="edx-pinned-ad-desc">{ad.description}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
