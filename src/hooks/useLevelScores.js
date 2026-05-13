// =============================================================================
// LEVEL SCORES HOOK -- src/hooks/useLevelScores.js
// =============================================================================
// Fetches the player's per-level completion history from Firestore.
//
// What it loads:
//   - Up to 200 most recent level completions for the signed-in user
//   - Each record: { level, score, win, stars, accuracy, created_at }
//
// Returns:
//   - scores:       raw array of records (Leaderboard "My Scores" tab)
//   - levelData:    map { [level]: { stars, highScore } } for LevelCarousel cards
//   - loading, error
//   - refresh():    re-query Firestore (call after a level completes when online)
//   - recordLocal(level, stars, score): optimistic in-memory bump so stars
//                   appear immediately, even offline -- merged with whatever
//                   the next Firestore refresh returns.
//
// Offline behavior:
//   - Firestore's IndexedDB cache returns whatever it has -- no error thrown.
//   - recordLocal() works regardless of network and is the primary path for
//     showing fresh stars during an active play session.
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import { isDemoMode } from '@/lib/demoMode';

export function useLevelScores() {
  const [scores,     setScores]     = useState([]);
  const [localBumps, setLocalBumps] = useState({}); // { [level]: { stars, highScore } }
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const load = useCallback(async () => {
    // Demo mode: nothing server-side to load
    if (isDemoMode()) {
      setScores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentFirebaseUser();
      if (!user) {
        setScores([]);
        setLoading(false);
        return;
      }

      const { getFirestore } = await import('@/lib/firebaseAuth');
      const { collection, query, where, orderBy, limit, getDocs } =
        await import('firebase/firestore');

      const db = await getFirestore();
      const q  = query(
        collection(db, 'levelScores'),
        where('uid', '==', user.uid),
        orderBy('score', 'desc'),
        limit(200),
      );

      const snap    = await getDocs(q);
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setScores(records);
    } catch (err) {
      console.error('[LevelScores] Failed to load:', err);
      setError('Could not load your scores.');
      // Don't clobber any local bumps that were already recorded
      setScores(prev => prev || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Optimistically record a freshly-completed level so stars appear NOW.
  // Works in demo mode, online, and offline.
  const recordLocal = useCallback((level, stars, score) => {
    if (typeof level !== 'number') return;
    setLocalBumps(prev => {
      const existing = prev[level];
      const nextHigh = Math.max(existing?.highScore ?? 0, score ?? 0);
      const nextStar = Math.max(existing?.stars     ?? 0, stars ?? 0);
      return { ...prev, [level]: { stars: nextStar, highScore: nextHigh } };
    });
  }, []);

  // Merge Firestore scores + local bumps into a per-level best map
  const levelData = useMemo(() => {
    const map = {};
    if (Array.isArray(scores)) {
      for (const s of scores) {
        const lvl = s?.level;
        if (typeof lvl !== 'number') continue;
        const existing = map[lvl];
        if (!existing || (s.score ?? 0) > (existing.highScore ?? 0)) {
          map[lvl] = { stars: s.stars ?? 0, highScore: s.score ?? 0 };
        }
      }
    }
    // Local bumps win when they're higher than any server record
    for (const [lvl, bump] of Object.entries(localBumps)) {
      const k = Number(lvl);
      const existing = map[k];
      if (!existing) {
        map[k] = bump;
      } else {
        map[k] = {
          stars:     Math.max(existing.stars ?? 0,     bump.stars ?? 0),
          highScore: Math.max(existing.highScore ?? 0, bump.highScore ?? 0),
        };
      }
    }
    return map;
  }, [scores, localBumps]);

  return { scores, levelData, loading, error, refresh: load, recordLocal };
}
