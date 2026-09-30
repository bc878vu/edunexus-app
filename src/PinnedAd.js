import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Pin } from "lucide-react";
import { db } from "./firebase-client";
import "./pinned-ad.css";

// PinnedAd v1.0.1 — dashboard video announcement (redeploy trigger)

const PINNED_ADS = collection(db, "artifacts/edunexus-live/public/data/pinned_ads");

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
    // Quota fix 2026-09-30: one-time cached fetch instead of a live listener.
    // Pinned ads change rarely (admin-set); cache for 1 hour in localStorage.
    const CACHE_KEY = "edx-pinned-ad-cache-v1";
    const pickActive = (items) => {
      const now = Date.now();
      return items.find((item) => {
        if (item.isActive === false) return false;
        if (item.startAt) {
          const start = item.startAt?.toMillis ? item.startAt.toMillis() : new Date(item.startAt).getTime();
          if (Number.isFinite(start) && now < start) return false;
        }
        if (item.endAt) {
          const end = item.endAt?.toMillis ? item.endAt.toMillis() : new Date(item.endAt).getTime();
          if (Number.isFinite(end) && now > end) return false;
        }
        return true;
      }) || null;
    };
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.ts < 3600000) {
        setAd(pickActive(cached.items));
        return;
      }
    } catch (_) {}
    (async () => {
      try {
        const q = query(PINNED_ADS, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch (_) {}
        setAd(pickActive(items));
      } catch (_) { setAd(null); }
    })();
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
