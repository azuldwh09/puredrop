/**
 * Fetches all LevelScore records for the current user from Firestore.
 * Offline-first: loads from localStorage cache instantly, syncs when online.
 */
import { useState, useEffect } from 'react';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import { getFirestore } from '@/lib/firebaseAuth';
import { isDemoMode } from '@/lib/demoMode';

const LEVEL_SCORES_CACHE_KEY = 'puredrop_level_scores';

function getCachedLevelScores() {
  try { return JSON.parse(localStorage.getItem(LEVEL_SCORES_CACHE_KEY)) || null; }
  catch { return null; }
}

function setCachedLevelScores(map) {
  try { localStorage.setItem(LEVEL_SCORES_CACHE_KEY, JSON.stringify(map)); } catch {}
}

export function useLevelScores() {
  const [levelData, setLevelData] = useState(() => getCachedLevelScores() || {});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode()) { setLoading(false); return; }

    const load = async () => {
      const cached = getCachedLevelScores();
      if (cached) { setLevelData(cached); setLoading(false); }

      try {
        const user = await getCurrentFirebaseUser();
        if (!user) { setLoading(false); return; }

        const db = await getFirestore();
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'levelScores'), where('uid', '==', user.uid));
        const snap = await getDocs(q);

        const map = {};
        for (const d of snap.docs) {
          const s = d.data();
          const prev = map[s.level];
          if (!prev || s.stars > prev.stars || (s.stars === prev.stars && s.score > prev.highScore)) {
            map[s.level] = { stars: s.stars || 0, highScore: s.score };
          }
        }
        setLevelData(map);
        setCachedLevelScores(map);
      } catch (err) {
        console.warn('useLevelScores: could not fetch from Firestore', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    window.addEventListener('online', load);
    return () => window.removeEventListener('online', load);
  }, []);

  const updateLocalScore = (level, stars, score) => {
    setLevelData(prev => {
      const existing = prev[level];
      if (existing && existing.stars >= stars && existing.highScore >= score) return prev;
      const updated = { ...prev, [level]: { stars: Math.max(existing?.stars || 0, stars), highScore: Math.max(existing?.highScore || 0, score) } };
      setCachedLevelScores(updated);
      return updated;
    });
  };

  return { levelData, loading, updateLocalScore };
}
