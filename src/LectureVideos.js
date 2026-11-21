// src/LectureVideos.js — Home page "Lecture Videos" section (above Highlights).
//
// Data: admin-managed Supabase `tutorials` rows with kind === 'lecture'
// (admin panel → Tutorials tab). Nothing is hardcoded here: the list, the
// order and the first (autoplay) video all come from that store.
//
// AUTOPLAY, honestly: browsers block autoplay WITH sound everywhere, so the
// first video starts MUTED (autoplay=1&mute=1&playsinline=1, loading="eager"
// so it really starts on arrival). A prominent "Sound on" button unmutes it
// via the YouTube player API (position kept); if the player is not ready
// yet, the iframe reloads with sound on. Any video the user picks from the
// list plays WITH sound, because the tap is a user gesture.
//
// Embed: same youtube.com/embed/<id> pattern the articles use, with the
// same sandbox/allow attributes TutorialHub uses. The section hides itself
// when no active lecture exists (so an empty store never shows an empty box).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listTutorials } from './db/tutorials';
import { youtubeId } from './youtube-video.mjs';

const CHANNEL_URL = 'https://www.youtube.com/@EduNexusVU';
const EMBED_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

function embedSrc(videoId, { autoplay = true, muted = false } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    playsinline: '1',
    rel: '0',
    enablejsapi: '1',
  });
  return 'https://www.youtube.com/embed/' + videoId + '?' + params.toString();
}

function sortLectures(items) {
  return [...items].sort((a, b) => {
    const ao = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

export default function LectureVideosSection({ theme }) {
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  const [forceSound, setForceSound] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    listTutorials({ limit: 500 }).then((items) => {
      if (!alive) return;
      const lectures = (items || [])
        .filter((v) => v.kind === 'lecture' && v.isActive !== false && v.type !== 'file' && youtubeId(v.url || ''))
        .map((v) => ({ ...v, videoId: youtubeId(v.url) }));
      // Same YouTube video listed twice shows once.
      const seen = new Set();
      const uniq = lectures.filter((v) => {
        if (seen.has(v.videoId)) return false;
        seen.add(v.videoId);
        return true;
      });
      setVideos(sortLectures(uniq));
      setLoaded(true);
    }).catch(() => {
      if (alive) setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const featured = useMemo(() => videos.find((v) => v.isFeatured) || videos[0] || null, [videos]);
  const current = useMemo(() => videos.find((v) => v.id === selectedId) || featured, [videos, selectedId, featured]);
  const userPicked = selectedId !== null && videos.some((v) => v.id === selectedId);

  // Reset sound state whenever the playing video changes.
  const currentId = current ? current.id : null;
  useEffect(() => {
    setSoundOn(false);
    setForceSound(false);
    setPlayerReady(false);
  }, [currentId]);

  const postPlayerCommand = (func, args = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        'https://www.youtube.com',
      );
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleUnmute = () => {
    // Unmute is a user gesture: try the player API first (keeps the current
    // position); if the player is not ready yet, reload with sound on.
    const ok = postPlayerCommand('unMute') && postPlayerCommand('setVolume', [100]);
    postPlayerCommand('playVideo');
    if (!ok) setForceSound(true);
    setSoundOn(true);
  };

  const handleMute = () => {
    postPlayerCommand('mute');
    setForceSound(false);
    setSoundOn(false);
  };

  if (!loaded || !current) return null;

  const muted = !userPicked && !forceSound;
  const textColor = (theme && theme.text) || undefined;
  const mutedColor = (theme && theme.textMuted) || undefined;
  const accentColor = (theme && theme.accent) || undefined;

  return (
    <section id="lecture-videos" className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
            YouTube · EduNexus
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: textColor }}>
            Lecture videos
          </h2>
          <p className="text-sm mt-1" style={{ color: mutedColor }}>
            VU lectures, subject-wise — pehli video khud chalti hai (muted). Sound ke liye “Sound on” dabayein.
          </p>
        </div>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shrink-0"
          style={{ background: accentColor || '#38BDF8', color: '#0F172A' }}
        >
          YouTube channel ↗
        </a>
      </div>

      <div className="edx-lecture-grid">
        <div className="edx-lecture-player">
          <iframe
            key={current.videoId + ':' + (muted ? 'muted' : 'sound')}
            ref={iframeRef}
            src={embedSrc(current.videoId, { autoplay: true, muted })}
            title={current.title || 'Lecture video'}
            loading="eager"
            allow={EMBED_ALLOW}
            allowFullScreen
            onLoad={() => setPlayerReady(true)}
          />
          <span className="edx-lecture-now">
            {current.subjectCode || current.category || 'Lecture'}
            {current.isFeatured ? ' · First' : ''}
          </span>
          {!userPicked && !soundOn && (
            <button
              type="button"
              className="edx-lecture-sound"
              onClick={handleUnmute}
              disabled={!playerReady}
              title="Sound on karein"
            >
              🔊 Sound on
            </button>
          )}
          {soundOn && (
            <button type="button" className="edx-lecture-sound" onClick={handleMute} title="Mute karein">
              🔇 Mute
            </button>
          )}
        </div>

        <div className="edx-lecture-list" role="list" aria-label="Lecture videos">
          {videos.map((v) => (
            <button
              key={v.id}
              type="button"
              role="listitem"
              className={'edx-lecture-item' + (v.id === current.id ? ' is-active' : '')}
              onClick={() => setSelectedId(v.id)}
              aria-current={v.id === current.id}
            >
              <img
                src={'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg'}
                alt=""
                loading="lazy"
                className="edx-lecture-thumb"
              />
              <span className="edx-lecture-item-text">
                <span className="edx-lecture-item-title" style={{ color: textColor }}>{v.title}</span>
                <span className="edx-lecture-item-meta" style={{ color: mutedColor }}>
                  {v.subjectCode || v.category || 'Lecture'}
                  {v.isFeatured ? ' · First' : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
