// src/useAdminBanks.js — Load admin-uploaded test-paper banks once per session.
//
// The load is cached in module state so the list, the builder and the pattern
// link share one fetch. On failure the hook reports an empty bank list (the
// student pages keep working from the code banks); the admin tab uses
// listAdminBanks() directly so failures there are shown, not swallowed.

import { useEffect, useState } from 'react';
import { listAdminBanks } from './db/testPaperBanks.js';

let cache = null;

export function loadAdminBanks() {
  if (!cache) cache = listAdminBanks().catch(() => []);
  return cache;
}

export function useAdminBanks() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadAdminBanks().then((list) => {
      if (alive) {
        setBanks(list);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return { banks, loading };
}
