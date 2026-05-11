// BACKUP — 2026-04-28 — pre offline-first refactor
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MAX_CUPS, REFILL_INTERVAL_MS } from '@/lib/cupSkins';
import { getLevelConfig } from '@/lib/levelConfig';
import { isDemoMode, getDemoProfile, updateDemoProfile, DEMO_MAX_LEVEL, DEMO_MAX_CUPS } from '@/lib/demoMode';

export function usePlayerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (isDemoMode()) {
      setProfile(getDemoProfile());
      setLoading(false);
      return;
    }

    const user = await base44.auth.me();
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
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const autoRefill = async (p) => {
    const now = Date.now();
    const last = new Date(p.last_refill_time).getTime();
    const elapsed = now - last;
    const cupsToAdd = Math.floor(elapsed / REFILL_INTERVAL_MS);

    if (cupsToAdd > 0 && p.cups < MAX_CUPS) {
      const newCups = Math.min(MAX_CUPS, p.cups + cupsToAdd);
      const newLastRefill = new Date(last + cupsToAdd * REFILL_INTERVAL_MS).toISOString();
      const updated = await base44.entities.PlayerProfile.update(p.id, {
        cups: newCups,
        last_refill_time: newLastRefill,
      });
      return updated;
    }
    return p;
  };

  const updateStreak = async (p) => {
    const today = new Date().toDateString();
    if (p.last_play_date === today) return p;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = p.last_play_date === yesterday ? (p.streak || 0) + 1 : 1;
    const updated = await base44.entities.PlayerProfile.update(p.id, {
      streak: newStreak,
      last_play_date: today,
    });
    return updated;
  };

  const spendCup = useCallback(async () => {
    if (!profile || profile.cups <= 0) return false;
    const newCups = profile.cups - 1;
    if (isDemoMode()) {
      setProfile(updateDemoProfile({ cups: newCups }));
      return true;
    }
    const optimistic = { ...profile, cups: newCups };
    setProfile(optimistic);
    const updated = await base44.entities.PlayerProfile.update(profile.id, { cups: newCups });
    setProfile(updated);
    return true;
  }, [profile]);

  const addCup = useCallback(async (amount = 1) => {
    if (!profile) return;
    const newCups = isDemoMode()
      ? Math.min(DEMO_MAX_CUPS, profile.cups + amount)
      : Math.min(MAX_CUPS + 2, profile.cups + amount);
    if (isDemoMode()) {
      setProfile(updateDemoProfile({ cups: newCups }));
      return;
    }
    setProfile(prev => ({ ...prev, cups: newCups }));
    const updated = await base44.entities.PlayerProfile.update(profile.id, { cups: newCups });
    setProfile(updated);
  }, [profile]);

  const setSkin = useCallback(async (skinId) => {
    if (!profile) return;
    if (isDemoMode()) {
      setProfile(updateDemoProfile({ selected_cup_skin: skinId }));
      return;
    }
    const updated = await base44.entities.PlayerProfile.update(profile.id, { selected_cup_skin: skinId });
    setProfile(updated);
  }, [profile]);

  const updateProgress = useCallback(async (level, score, win) => {
    if (!profile) return;
    const updates = { total_score: (profile.total_score || 0) + score };
    if (win && level >= (profile.highest_level || 1)) {
      const nextLevel = level + 1;
      updates.highest_level = nextLevel;
      updates.difficulty_tier = getLevelConfig(nextLevel).tier;
    }
    if (isDemoMode()) {
      if (updates.highest_level) updates.highest_level = Math.min(updates.highest_level, DEMO_MAX_LEVEL);
      setProfile(updateDemoProfile(updates));
      return;
    }
    const updated = await base44.entities.PlayerProfile.update(profile.id, updates);
    setProfile(updated);

    const user = await base44.auth.me();
    await base44.entities.LevelScore.create({ user_email: user.email, level, score, win });

    if (win && !profile.hide_from_leaderboard) {
      await base44.entities.Leaderboard.create({
        user_email: user.email,
        display_name: user.full_name || user.email.split('@')[0],
        level,
        score,
      });
      const allEntries = await base44.entities.Leaderboard.list('-score', 200);
      if (allEntries.length > 50) {
        const toDelete = allEntries.slice(50);
        await Promise.all(toDelete.map(e => base44.entities.Leaderboard.delete(e.id)));
      }
    }

    const allPersonal = await base44.entities.LevelScore.filter({ user_email: user.email }, '-score', 100);
    if (allPersonal.length > 10) {
      const toDelete = allPersonal.slice(10);
      await Promise.all(toDelete.map(e => base44.entities.LevelScore.delete(e.id)));
    }
  }, [profile]);

  const nextRefillIn = profile ? (() => {
    if (profile.cups >= MAX_CUPS) return null;
    const last = new Date(profile.last_refill_time).getTime();
    const next = last + REFILL_INTERVAL_MS;
    const diff = Math.max(0, next - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  })() : null;

  return { profile, loading, spendCup, addCup, setSkin, updateProgress, nextRefillIn, reload: loadProfile };
}