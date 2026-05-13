// =============================================================================
// LEVEL SCORES HOOK -- src/hooks/useLevelScores.js
// =============================================================================
// Fetches a player's personal level-completion history from Firestore.
// Used by the Leaderboard screen's "My Scores" tab.
//
// What it loads:
//   - Up to 10 most recent level completions for the signed-in user
//   - Ordered by score descending
//   - Each record: { level, score, win, stars, accuracy, created_at }
//
// Offline behavior:
//   - If Firestore cache has results, returns those immediately
//   - If offline and cache is empty, returns [] with no error
// =============================================================================

import { useState, useEffect } from 'react';
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
        // Get current user (resolves instantly if auth is already initialized)
        const user = await getCurrentFirebaseUser();
        if (!user) {
          setScores([]);
          setLoading(false);
          return;
        }

        // Lazy-import Firestore to avoid blocking the initial render
        const { getFirestore }                                 = await import('@/lib/firebaseAuth');
        const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

        const db = await getFirestore();
        const q  = query(
          collection(db, 'levelScores'),
          where('uid', '==', user.uid),
          orderBy('score', 'desc'),
          limit(10)
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

  return { scores, loading, error };
}
