import { useState, useEffect, useCallback, useRef } from 'react';
import { MAX_CUPS, REFILL_INTERVAL_MS } from '@/lib/cupSkins';
import { getLevelConfig } from '@/lib/levelConfig';
import { isDemoMode, getDemoProfile, updateDemoProfile, DEMO_MAX_CUPS } from '@/lib/demoMode';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import {
  getOrCreateProfile, updateProfile, getProfile,
  saveLevelScore, saveLeaderboardEntry, removeLeaderboardEntriesForUser,
} from '@/lib/firebaseDb';

export function computeStars(score, catchRate, win) {
  if (!win) return 0;
  if (score >= 2000 && catchRate >= 0.9) return 3;
  if (score >= 800 || catchRate >= 0.7) return 2;
  return 1;
}

export function usePlayerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const profileRef = useRef(null);

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
      const user = await getCurrentFirebaseUser();
      if (!user) throw new Error('Not authenticated');

      let p = await getOrCreateProfile(user.uid, user.email, user.displayName);
      p = await autoRefill(p, user.uid);
      p = await updateStreak(p, user.uid);
      setProfile(p);
    } catch (err) {
      console.error('usePlayerProfile: load failed', err);
      setError(err?.message || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const autoRefill = async (p, uid) => {
    const now = Date.now();
    const last = new Date(p.last_refill_time).getTime();
    if (isNaN(last)) return p;
    const cupsToAdd = Math.floor((now - last) / REFILL_INTERVAL_MS);
    if (cupsToAdd > 0 && p.cups < MAX_CUPS) {
      const newCups = Math.min(MAX_CUPS, p.cups + cupsToAdd);
      const newLastRefill = new Date(last + cupsToAdd * REFILL_INTERVAL_MS).toISOString();
      try { return await updateProfile(uid, { cups: newCups, last_refill_time: newLastRefill }); }
      catch { return p; }
    }
    return p;
  };

  const updateStreak = async (p, uid) => {
    const today = new Date().toDateString();
    if (p.last_play_date === today) return p;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = p.last_play_date === yesterday ? (p.streak || 0) + 1 : 1;
    try { return await updateProfile(uid, { streak: newStreak, last_play_date: today }); }
    catch { return p; }
  };

  const spendCup = useCallback(async () => {
    const p = profileRef.current;
    if (!p || p.cups <= 0) return false;
    const newCups = p.cups - 1;
    if (isDemoMode()) { setProfile(updateDemoProfile({ cups: newCups })); return true; }
    setProfile(prev => ({ ...prev, cups: newCups }));
    try {
      const updated = await updateProfile(p.id, { cups: newCups });
      setProfile(updated);
      return true;
    } catch (err) {
      console.error('spendCup failed:', err);
      setProfile(p);
      return false;
    }
  }, []);

  const addCup = useCallback(async (amount = 1) => {
    let p = profileRef.current;
    if (!p) {
      await new Promise(r => setTimeout(r, 1000));
      p = profileRef.current;
      if (!p) { console.error('addCup: profile still null'); return; }
    }
    const newCups = isDemoMode()
      ? Math.min(DEMO_MAX_CUPS, p.cups + amount)
      : Math.min(MAX_CUPS + 2, p.cups + amount);

    if (isDemoMode()) { setProfile(updateDemoProfile({ cups: newCups })); return; }
    setProfile(prev => ({ ...prev, cups: newCups }));
    try {
      const updated = await updateProfile(p.id, { cups: newCups });
      setProfile(updated);
    } catch (err) {
      console.error('addCup failed:', err);
      setProfile(p);
    }
  }, []);

  const setSkin = useCallback(async (skinId) => {
    const p = profileRef.current;
    if (!p) return;
    if (isDemoMode()) { setProfile(updateDemoProfile({ selected_cup_skin: skinId })); return; }
    try {
      const updated = await updateProfile(p.id, { selected_cup_skin: skinId });
      setProfile(updated);
    } catch (err) { console.error('setSkin failed:', err); }
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
    if (isDemoMode()) { setProfile(updateDemoProfile(updates)); return; }
    try {
      const updated = await updateProfile(p.id, updates);
      setProfile(updated);

      const user = await getCurrentFirebaseUser();
      if (!user) return;
      const stars = computeStars(score, catchRate, win);
      await saveLevelScore(user.uid, user.email, level, score, win, stars, catchRate);

      if (win && !p.hide_from_leaderboard) {
        await saveLeaderboardEntry(
          user.uid, user.email,
          user.displayName || user.email.split('@')[0],
          level, score
        );
      }
    } catch (err) { console.error('updateProgress failed:', err); }
  }, []);

  const nextRefillIn = profile ? (() => {
    if (profile.cups >= MAX_CUPS) return null;
    const last = new Date(profile.last_refill_time).getTime();
    if (isNaN(last)) return null;
    const diff = Math.max(0, (last + REFILL_INTERVAL_MS) - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  })() : null;

  return { profile, loading, error, spendCup, addCup, setSkin, updateProgress, nextRefillIn, reload: loadProfile };
}
