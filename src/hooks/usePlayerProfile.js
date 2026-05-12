import { useState, useEffect, useCallback, useRef } from 'react';
import { MAX_CUPS, REFILL_INTERVAL_MS } from '@/lib/cupSkins';
import { getLevelConfig } from '@/lib/levelConfig';
import { isDemoMode, getDemoProfile, updateDemoProfile, DEMO_MAX_CUPS } from '@/lib/demoMode';
import { useAuth } from '@/lib/AuthContext';
import {
  getOrCreateProfile, updateProfile,
  saveLevelScore, saveLeaderboardEntry,
} from '@/lib/firebaseDb';
import { diagStep } from '@/components/game/DiagPanel';

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

  const { user: authUser, isLoadingAuth } = useAuth();
  const authUserRef = useRef(authUser);
  useEffect(() => { authUserRef.current = authUser; }, [authUser]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const loadProfile = useCallback(async (user) => {
    diagStep('profile:1:start', 'run', 'loadProfile called, user=' + (user ? user.uid : 'null'));
    setLoading(true);
    setError(null);

    if (isDemoMode()) {
      diagStep('profile:1:start', 'skip', 'demo mode -- using local profile');
      setProfile(getDemoProfile());
      setLoading(false);
      return;
    }

    if (!user) {
      diagStep('profile:1:start', 'skip', 'no user -- skipping load');
      setLoading(false);
      return;
    }

    diagStep('profile:2:cache', 'run', 'checking localStorage cache...');
    const cached = getCachedProfile();
    if (cached && cached.uid === user.uid) {
      diagStep('profile:2:cache', 'ok', 'cache HIT -- cups=' + cached.cups + ' skin=' + cached.selected_cup_skin);
      setProfile(cached);
      setLoading(false);
    } else {
      diagStep('profile:2:cache', 'skip', cached ? 'uid mismatch (cached uid=' + cached.uid + ')' : 'no cache entry');
    }

    diagStep('profile:3:firestore', 'run', 'getOrCreateProfile uid=' + user.uid);
    try {
      let p = await getOrCreateProfile(user.uid, user.email, user.displayName);
      diagStep('profile:3:firestore', 'ok', 'got profile, _local=' + (p._local ? 'YES' : 'no') + ' cups=' + p.cups);

      diagStep('profile:4:refill', 'run', 'autoRefill...');
      p = await autoRefill(p, user.uid);
      diagStep('profile:4:refill', 'ok', 'cups after refill=' + p.cups);

      diagStep('profile:5:streak', 'run', 'updateStreak...');
      p = await updateStreak(p, user.uid);
      diagStep('profile:5:streak', 'ok', 'streak=' + p.streak);

      diagStep('profile:6:done', 'ok', 'profile ready -- cups=' + p.cups + ' level=' + p.highest_level);
      setCachedProfile(p);
      setProfile(p);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      diagStep('profile:3:firestore', 'fail', msg);
      console.error('[Profile] load failed:', err);
      const current = profileRef.current;
      if (!current) {
        diagStep('profile:6:done', 'fail', 'no fallback available');
        setError(msg);
      } else {
        diagStep('profile:6:done', 'ok', 'using cached fallback');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadedForUidRef = useRef(null);
  useEffect(() => {
    diagStep('profile:0:authwait', isLoadingAuth ? 'run' : 'ok',
      isLoadingAuth ? 'waiting for Firebase auth...' : 'auth settled, isAuthenticated=' + !!authUser);

    if (isLoadingAuth) return;

    const uid = authUser ? authUser.uid : null;

    if (isDemoMode()) {
      loadProfile(null);
      return;
    }

    if (uid && uid !== loadedForUidRef.current) {
      loadedForUidRef.current = uid;
      loadProfile(authUser);
      return;
    }

    if (!uid) {
      diagStep('profile:0:authwait', 'skip', 'no user after auth settled');
      setLoading(false);
    }
  }, [isLoadingAuth, authUser, loadProfile]);

  useEffect(() => {
    const handleOnline = () => {
      const p = profileRef.current;
      const user = authUserRef.current;
      if (p && p._local && user) {
        diagStep('profile:online-sync', 'run', 'back online -- syncing local profile');
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
    diagStep('cups:spend', 'ok', 'cups ' + p.cups + ' -> ' + newCups);
    if (isDemoMode()) { setProfile(updateDemoProfile({ cups: newCups })); return true; }
    setProfile(prev => ({ ...prev, cups: newCups }));
    try {
      const updated = await updateProfile(p.id, { cups: newCups });
      setProfile(updated);
      return true;
    } catch (err) {
      diagStep('cups:spend', 'fail', err && err.message);
      setProfile(p);
      return false;
    }
  }, []);

  const addCup = useCallback(async (amount) => {
    const n = amount !== undefined ? amount : 1;
    let p = profileRef.current;
    if (!p) {
      diagStep('cups:add', 'run', 'profile null -- waiting 2s');
      await new Promise(r => setTimeout(r, 2000));
      p = profileRef.current;
      if (!p) {
        diagStep('cups:add', 'fail', 'profile still null after 2s wait');
        return;
      }
    }
    const cap = isDemoMode() ? DEMO_MAX_CUPS : MAX_CUPS;
    const newCups = Math.min(cap, p.cups + n);
    diagStep('cups:add', 'ok', 'cups ' + p.cups + ' + ' + n + ' = ' + newCups + ' (cap=' + cap + ')');
    if (isDemoMode()) { setProfile(updateDemoProfile({ cups: newCups })); return; }
    setProfile(prev => ({ ...prev, cups: newCups }));
    try {
      const updated = await updateProfile(p.id, { cups: newCups });
      setProfile(updated);
    } catch (err) {
      diagStep('cups:add', 'fail', err && err.message);
      setProfile(p);
    }
  }, []);

  const setSkin = useCallback(async (skinId) => {
    const p = profileRef.current;
    if (!p) return;
    diagStep('skin:set', 'run', 'setting skin=' + skinId);
    if (isDemoMode()) { setProfile(updateDemoProfile({ selected_cup_skin: skinId })); return; }
    const optimistic = { ...p, selected_cup_skin: skinId };
    setProfile(optimistic);
    setCachedProfile(optimistic);
    try {
      const updated = await updateProfile(p.id, { selected_cup_skin: skinId });
      diagStep('skin:set', 'ok', 'skin saved');
      setProfile(updated);
      setCachedProfile(updated);
    } catch (err) {
      diagStep('skin:set', 'fail', err && err.message);
    }
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
    diagStep('profile:reload', 'run', 'manual reload triggered');
    if (user) loadProfile(user);
    else diagStep('profile:reload', 'fail', 'no user -- cannot reload');
  }, [loadProfile]);

  return { profile, loading, error, spendCup, addCup, setSkin, updateProgress, nextRefillIn, reload };
}
