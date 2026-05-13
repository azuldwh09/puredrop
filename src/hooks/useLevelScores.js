// =============================================================================
// LEVEL SCORES HOOK -- src/hooks/useLevelScores.js
// =============================================================================
// Local-first per-level score & star tracking.
//
// How it works:
//   1. On mount, immediately read from localStorage (lib/localScores.js).
//      The UI gets stars + high scores without any network latency.
//   2. In the background, try to fetch the player's Firestore history and
//      merge it into local storage (keeping the best of each field).
//   3. recordLocal() is the path used at end-of-level: it writes to local
//      storage synchronously and updates the in-memory map immediately so
//      the carousel reflects the new stars before the player even sees the
//      game-over screen.
//
// Returns:
//   - levelData:    map { [level]: { stars, highScore } } for LevelCarousel
//   - scores:       flat array (for the Leaderboard "My Scores" tab)
//   - loading, error
//   - refresh():    re-fetch Firestore (no-op offline -- local data is still
//                   authoritative)
//   - recordLocal(level, stars, score, win, accuracy):
//                   write a fresh level result to local storage and update
//                   the in-memory map. Always succeeds, online or offline.
// =============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import { isDemoMode } from '@/lib/demoMode';
import {
  getAllForUser,
  recordLevelResult,
  mergeRemoteScores,
} from '@/lib/localScores';

export function useLevelScores() {
  // localMap mirrors localStorage but lives in React state so changes trigger
  // re-renders. It is the authoritative source the carousel reads from.
  const [localMap,   setLocalMap]   = useState({});  // { [level]: record }
  const [remoteList, setRemoteList] = useState([]);  // raw Firestore rows
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const uidRef = useRef(null);

  // ---- Initial load: localStorage first, then Firestore in background ------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Determine which UID bucket to read from.
    let uid = 'demo';
    if (!isDemoMode()) {
      try {
        const user = await getCurrentFirebaseUser();
        if (user && user.uid) uid = user.uid;
      } catch { /* fall through, treat as demo */ }
    }
    uidRef.current = uid;

    // ----- Step 1: synchronous local read (always succeeds) -----------------
    setLocalMap(getAllForUser(uid));
    setLoading(false);

    // ----- Step 2: background Firestore reconcile (best-effort) -------------
    if (isDemoMode() || uid === 'demo') return;

    try {
      const { getFirestore } = await import('@/lib/firebaseAuth');
      const { collection, query, where, orderBy, limit, getDocs } =
        await import('firebase/firestore');
      const db   = await getFirestore();
      const q    = query(
        collection(db, 'levelScores'),
        where('uid', '==', uid),
        orderBy('score', 'desc'),
        limit(500),
      );
      const snap    = await getDocs(q);
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRemoteList(records);
      // Merge remote into local store and reload the map
      mergeRemoteScores(uid, records);
      setLocalMap(getAllForUser(uid));
    } catch (err) {
      // Offline or permission error -- not fatal. Local data still shows.
      console.warn('[LevelScores] remote reconcile skipped:', err && (err.code || err.message));
      setError(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- recordLocal: write a fresh result, return the merged record ---------
  const recordLocal = useCallback((level, stars, score, win, accuracy) => {
    const uid = uidRef.current || 'demo';
    const merged = recordLevelResult(uid, level, score, stars, win, accuracy ?? 0);
    if (merged) {
      // Update in-memory state synchronously so the carousel sees the change
      // on the very next render.
      setLocalMap(prev => ({ ...prev, [level]: merged }));
    }
    return merged;
  }, []);

  // ---- Derived shapes for consumers ----------------------------------------
  // levelData: trimmed { [level]: { stars, highScore } } for the carousel.
  const levelData = useMemo(() => {
    const out = {};
    for (const [lvl, rec] of Object.entries(localMap)) {
      out[Number(lvl)] = { stars: rec.stars || 0, highScore: rec.highScore || 0 };
    }
    return out;
  }, [localMap]);

  // scores: flat array of every Firestore record (used by Leaderboard's
  // "My Scores" tab). Local-only history doesn't appear here because the
  // leaderboard tab is inherently a server view.
  const scores = remoteList;

  return { scores, levelData, localMap, loading, error, refresh: load, recordLocal };
}
