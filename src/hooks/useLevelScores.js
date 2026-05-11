/**
 * Fetches all LevelScore records for the current user and returns a map:
 *   { [level]: { stars, highScore } }
 * Offline-first: loads from localStorage cache instantly, syncs when online.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getCachedUser, isOnline } from '@/lib/offlineStorage';
import { isDemoMode } from '@/lib/demoMode';

const LEVEL_SCORES_CACHE_KEY = 'puredrop_level_scores';

function getCachedLevelScores() {
  try {
    const raw = localStorage.getItem(LEVEL_SCORES_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCachedLevelScores(map) {
  try {
    localStorage.setItem(LEVEL_SCORES_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

export function useLevelScores() {
  const [levelData, setLevelData] = useState(() => getCachedLevelScores() || {});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode()) { setLoading(false); return; }

    const load = async () => {
      // Show cached data instantly while we try network
      const cached = getCachedLevelScores();
      if (cached) { setLevelData(cached); setLoading(false); }

      if (!isOnline()) return; // offline — cached data already applied

      try {
        const user = getCachedUser();
        if (!user) { setLoading(false); return; }
        const scores = await base44.entities.LevelScore.filter({ user_email: user.email });
        const map = {};
        for (const s of scores) {
          const prev = map[s.level];
          if (!prev || s.stars > prev.stars || (s.stars === prev.stars && s.score > prev.highScore)) {
            map[s.level] = { stars: s.stars || 0, highScore: s.score };
          }
        }
        setLevelData(map);
        setCachedLevelScores(map);
      } catch {
        // silently fail — cached data already showing
      } finally {
        setLoading(false);
      }
    };

    load();

    // Re-sync when coming back online
    const handleOnline = () => load();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Expose a method to update local cache after a new score is earned
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