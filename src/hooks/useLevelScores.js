// =============================================================================
// LEVEL SCORES HOOK -- src/hooks/useLevelScores.js
// =============================================================================
// Fetches a player's personal level-completion history from Firestore.
//
// What it loads:
//   - Up to 200 most recent level completions for the signed-in user
//   - Each record: { level, score, win, stars, accuracy, created_at }
//
// Returns:
//   - scores: raw array of records (used by Leaderboard "My Scores" tab)
//   - levelData: map of { [level]: { stars, highScore } } -- used by LevelCarousel
//                to render star ratings and best scores on each level card
//   - loading, error
//
// Offline behavior:
//   - If Firestore cache has results, returns those immediately
//   - If offline and cache is empty, returns {} with no error
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import { isDemoMode } from '@/lib/demoMode';

export function useLevelScores() {
  const [scores,  setScores]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    // Demo mode: no server scores to show
    if (isDemoMode()) {
      setScores([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await getCurrentFirebaseUser();
        if (!user) {
          setScores([]);
          setLoading(false);
          return;
        }

        const { getFirestore }                                 = await import('@/lib/firebaseAuth');
        const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

        const db = await getFirestore();
        const q  = query(
          collection(db, 'levelScores'),
          where('uid', '==', user.uid),
          orderBy('score', 'desc'),
          limit(200)
        );

        const snap    = await getDocs(q);
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setScores(records);
      } catch (err) {
        console.error('[LevelScores] Failed to load:', err);
        setError('Could not load your scores.');
        setScores([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Derive per-level best-score map (used by LevelCarousel cards)
  const levelData = useMemo(() => {
    const map = {};
    if (!Array.isArray(scores)) return map;
    for (const s of scores) {
      const lvl = s?.level;
      if (typeof lvl !== 'number') continue;
      const existing = map[lvl];
      if (!existing || (s.score ?? 0) > (existing.highScore ?? 0)) {
        map[lvl] = {
          stars:     s.stars ?? 0,
          highScore: s.score ?? 0,
        };
      }
    }
    return map;
  }, [scores]);

  return { scores, levelData, loading, error };
}
