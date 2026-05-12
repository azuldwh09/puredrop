import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { MAX_CUPS, REFILL_INTERVAL_MS } from '@/lib/cupSkins';
import { getLevelConfig } from '@/lib/levelConfig';
import { isDemoMode, getDemoProfile, updateDemoProfile, DEMO_MAX_CUPS } from '@/lib/demoMode';

export function computeStars(score, catchRate, win) {
  if (!win) return 0;
  if (score >= 2000 && catchRate >= 0.9) return 3;
  if (score >= 800 || catchRate >= 0.7) return 2;
  return 1;
}

const RETRY_DELAYS = [500, 1000, 2000, 3000]; // ms between retries

async function getAuthUserWithRetry() {
  let lastErr;
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    try {
      const user = await base44.auth.me();
      if (user?.email) return user;
    } catch (err) {
      lastErr = err;
    }
    if (i < RETRY_DELAYS.length) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
    }
  }
  throw lastErr || new Error('Not authenticated');
}

export function usePlayerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const profileRef = useRef(null);

  // Keep a ref in sync so callbacks always have the latest profile
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode()) {
      setProfile(getDemoProfile());
      setLoading(false);
      return;
    }

    try {
      // Retry auth.me() — Firebase session may not be flushed to Base44 yet
      const user = await getAuthUserWithRetry();

      const results = await base44.entities.PlayerProfile.filter({ user_email: user.email });
      let p = results[0];

      if (!p) {
        p = await base44.entities.PlayerProfile.create({
          user_email: user.email,
          cups: MAX_CUPS,
          last_refill_time: new Date().toISOString(),
          selected_cup_skin: 'classic',
          highest_level: 1,
          total_score: 0,
          streak: 1,
          last_play_date: new Date().toDateString(),
        });
      }

      p = await autoRefill(p);
      p = await updateStreak(p);
      setProfile(p);
    } catch (err) {
      console.error('usePlayerProfile: failed to load profile', err);
      setError(err?.message || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const autoRefill = async (p) => {
    const now = Date.now();
    const last = new Date(p.last_refill_time).getTime();
    if (isNaN(last)) return p;
    const elapsed = now - last;
    const cupsToAdd = Math.floor(elapsed / REFILL_INTERVAL_MS);
    if (cupsToAdd > 0 && p.cups < MAX_CUPS) {
      const newCups = Math.min(MAX_CUPS, p.cups + cupsToAdd);
      const newLastRefill = new Date(last + cupsToAdd * REFILL_INTERVAL_MS).toISOString();
      try {
        return await base44.entities.PlayerProfile.update(p.id, {
          cups: newCups,
          last_refill_time: newLastRefill,
        });
      } catch { return p; }
    }
    return p;
  };

  const updateStreak = async (p) => {
    const today = new Date().toDateString();
    if (p.last_play_date === today) return p;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = p.last_play_date === yesterday ? (p.streak || 0) + 1 : 1;
    try {
      return await base44.entities.PlayerProfile.update(p.id, {
        streak: newStreak,
        last_play_date: today,
      });
    } catch { return p; }
  };

  const spendCup = useCallback(async () => {
    const p = profileRef.current;
    if (!p || p.cups <= 0) return false;
    const newCups = p.cups - 1;
    if (isDemoMode()) {
      const updated = updateDemoProfile({ cups: newCups });
      setProfile(updated);
      return true;
    }
    setProfile(prev => ({ ...prev, cups: newCups }));
    try {
      const updated = await base44.entities.PlayerProfile.update(p.id, { cups: newCups });
      setProfile(updated);
    } catch (err) {
      console.error('spendCup failed:', err);
      // Roll back optimistic update
      setProfile(p);
      return false;
    }
    return true;
  }, []);

  const addCup = useCallback(async (amount = 1) => {
    const p = profileRef.current;
    if (!p) {
      console.warn('addCup: profile not loaded yet — retrying in 1s');
      // Retry once after a short delay (edge case: ad finishes before profile loads)
      await new Promise(r => setTimeout(r, 1000));
      const retryP = profileRef.current;
      if (!retryP) {
        console.error('addCup: profile still null after retry');
        return;
      }
    }
    const currentProfile = profileRef.current;
    const newCups = isDemoMode()
      ? Math.min(DEMO_MAX_CUPS, currentProfile.cups + amount)
      : Math.min(MAX_CUPS + 2, currentProfile.cups + amount);

    if (isDemoMode()) {
      setProfile(updateDemoProfile({ cups: newCups }));
      return;
    }
    // Optimistic update
    setProfile(prev => ({ ...prev, cups: newCups }));
    try {
      const updated = await base44.entities.PlayerProfile.update(currentProfile.id, { cups: newCups });
      setProfile(updated);
    } catch (err) {
      console.error('addCup failed:', err);
      setProfile(currentProfile); // rollback
    }
  }, []);

  const setSkin = useCallback(async (skinId) => {
    const p = profileRef.current;
    if (!p) return;
    if (isDemoMode()) {
      setProfile(updateDemoProfile({ selected_cup_skin: skinId }));
      return;
    }
    try {
      const updated = await base44.entities.PlayerProfile.update(p.id, { selected_cup_skin: skinId });
      setProfile(updated);
    } catch (err) {
      console.error('setSkin failed:', err);
    }
  }, []);

  const updateProgress = useCallback(async (level, score, win, catchRate = 0) => {
    const p = profileRef.current;
    if (!p) return;
    const updates = { total_score: (p.total_score || 0) + score };
    if (win && level >= (p.highest_level || 1)) {
      const nextLevel = level + 1;
      updates.highest_level = nextLevel;
      updates.difficulty_tier = getLevelConfig(nextLevel).tier;
    }
    if (isDemoMode()) {
      setProfile(updateDemoProfile(updates));
      return;
    }
    try {
      const updated = await base44.entities.PlayerProfile.update(p.id, updates);
      setProfile(updated);

      const user = await base44.auth.me();
      const stars = computeStars(score, catchRate, win);
      await base44.entities.LevelScore.create({
        user_email: user.email, level, score, win, stars, accuracy: catchRate,
      });

      if (win && !p.hide_from_leaderboard) {
        await base44.entities.Leaderboard.create({
          user_email: user.email,
          display_name: user.full_name || user.email.split('@')[0],
          level,
          score,
        });
        const allEntries = await base44.entities.Leaderboard.list('-score', 200);
        if (allEntries.length > 50) {
          await Promise.all(allEntries.slice(50).map(e => base44.entities.Leaderboard.delete(e.id)));
        }
      }
    } catch (err) {
      console.error('updateProgress failed:', err);
    }
  }, []);

  const nextRefillIn = profile ? (() => {
    if (profile.cups >= MAX_CUPS) return null;
    const last = new Date(profile.last_refill_time).getTime();
    if (isNaN(last)) return null;
    const next = last + REFILL_INTERVAL_MS;
    const diff = Math.max(0, next - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  })() : null;

  return { profile, loading, error, spendCup, addCup, setSkin, updateProgress, nextRefillIn, reload: loadProfile };
}
