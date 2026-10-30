// src/usePaperAttempts.js — Cached paper-attempts load for admin tabs.
//
// The Attempts tab keeps its own fresh fetch (it supports teacher marking);
// the Dashboard and Users tabs share this cached load so the graphs and the
// student list do not each re-read the same 200 docs.

import { useEffect, useState } from 'react';
import { listPaperAttempts } from './db/paperAttempts';

let cache = null;

export function loadPaperAttempts() {
  if (!cache) cache = listPaperAttempts(200).catch(() => []);
  return cache;
}

export function usePaperAttempts() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadPaperAttempts().then((list) => {
      if (alive) {
        setAttempts(list);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return { attempts, loading };
}
