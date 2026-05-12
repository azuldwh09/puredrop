import { useState, useEffect, useCallback, useRef } from 'react';
import { MAX_CUPS, REFILL_INTERVAL_MS } from '@/lib/cupSkins';
import { getLevelConfig } from '@/lib/levelConfig';
import { isDemoMode, getDemoProfile, updateDemoProfile, DEMO_MAX_CUPS } from '@/lib/demoMode';
import { useAuth } from '@/lib/AuthContext';
import {
  getOrCreateProfile, updateProfile,
  saveLevelScore, saveLeaderboardEntry,
} from '@/lib/firebaseDb';

const PROFILE_CACHE_KEY = 'puredrop_profile';

function getCachedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)); } catch { return null; }
}
function setCachedProfile(p) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)); } catch {}
}

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

  // Pull auth state from AuthContext -- single source of truth for the current user.
  // We wait for isLoadingAuth===false before attempting any profile load, so we
  // never hit the race where loadProfile runs before Firebase has restored the session.
  const { user: authUser, isLoadingAuth } = useAuth();
  const authUserRef = useRef(authUser);
  useEffect(() => { authUserRef.current = authUser; }, [authUser]);

  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Core profile loader. Only called AFTER auth has settled (isLoadingAuth===false).
  const loadProfile = useCallback(async (user) => {
    setLoading(true);
    setError(null);

    if (isDemoMode()) {
      setProfile(getDemoProfile());
      setLoading(false);
      return;
    }

    // If no user at all, nothing to load (App.jsx will show SignInScreen)
    if (!user) {
      setLoading(false);
      return;
    }

    // Show cached profile instantly so the UI isn't blank while we fetch
    const cached = getCachedProfile();
    if (cached && cached.uid === user.uid) {
      setProfile(cached);
      setLoading(false); // unblock UI immediately
    }

    // Fetch from Firestore (works offline via Firestore's own cache+IndexedDB)
    try {
      let p = await getOrCreateProfile(user.uid, user.email, user.displayName);
      p = await autoRefill(p, user.uid);
      p = await updateStreak(p, user.uid);
      setCachedProfile(p);
      setProfile(p);
    } catch (err) {
      console.error('[Profile] load failed:', err);
      // Only show error if we have no cached fallback
      const current = profileRef.current;
      if (!current) setError((err && err.message) || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []); // no deps -- uses args, not closures over state

  // Main trigger: fire loadProfile exactly once after auth has settled.
  // We track the last uid we loaded for to avoid double-loading.
  const loadedForUidRef = useRef(null);
  useEffect(() => {
    // Still waiting for Firebase to restore session -- do nothing yet
    if (isLoadingAuth) return;

    const uid = authUser ? authUser.uid : null;

    // Demo mode: load immediately regardless of auth
    if (isDemoMode()) {
      loadProfile(null);
      return;
    }

    // Auth settled with a user we haven't loaded for yet
    if (uid && uid !== loadedForUidRef.current) {
      loadedForUidRef.current = uid;
      loadProfile(authUser);
      return;
    }

    // Auth settled with no user -- not our job to handle (App.jsx shows sign-in screen)
    if (!uid) {
      setLoading(false);
    }
  }, [isLoadingAuth, authUser, loadProfile]);

  // If device comes back online while profile was a local-only fallback, re-sync
  useEffect(() => {
    const handleOnline = () => {
      const p = profileRef.current;
      const user = authUserRef.current;
      if (p && p._local && user) {
        console.log('[Profile] Back online -- syncing to Firestore');
        loadProfile(user);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadProfile]);

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

  const addCup = useCallback(async (amount) => {
    const n = amount !== undefined ? amount : 1;
    let p = profileRef.current;
    if (!p) {
      // Profile not ready yet -- wait up to 2s
      await new Promise(r => setTimeout(r, 2000));
      p = profileRef.current;
      if (!p) { console.error('addCup: profile still null after wait'); return; }
    }
    // Hard cap at MAX_CUPS (5) -- no overflowing
    const cap = isDemoMode() ? DEMO_MAX_CUPS : MAX_CUPS;
    const newCups = Math.min(cap, p.cups + n);

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
    const optimistic = { ...p, selected_cup_skin: skinId };
    setProfile(optimistic);
    setCachedProfile(optimistic);
    try {
      const updated = await updateProfile(p.id, { selected_cup_skin: skinId });
      setProfile(updated);
      setCachedProfile(updated);
    } catch (err) { console.error('setSkin failed:', err); }
  }, []);

  const updateProgress = useCallback(async (level, score, win, catchRate) => {
    const rate = catchRate !== undefined ? catchRate : 0;
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

      const user = authUserRef.current;
      if (!user) return;
      const stars = computeStars(score, rate, win);
      await saveLevelScore(user.uid, user.email, level, score, win, stars, rate);

      if (win && !p.hide_from_leaderboard) {
        await saveLeaderboardEntry(
          user.uid, user.email,
          user.displayName || user.email.split('@')[0],
          level, score
        );
      }
    } catch (err) { console.error('updateProgress failed:', err); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nextRefillIn = profile ? (() => {
    if (profile.cups >= MAX_CUPS) return null;
    const last = new Date(profile.last_refill_time).getTime();
    if (isNaN(last)) return null;
    const diff = Math.max(0, (last + REFILL_INTERVAL_MS) - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return h + 'h ' + m + 'm ' + s + 's';
  })() : null;

  const reload = useCallback(() => {
    const user = authUserRef.current;
    if (user) loadProfile(user);
  }, [loadProfile]);

  return { profile, loading, error, spendCup, addCup, setSkin, updateProgress, nextRefillIn, reload };
}
