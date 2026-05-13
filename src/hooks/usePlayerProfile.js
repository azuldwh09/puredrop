// =============================================================================
// PLAYER PROFILE HOOK -- src/hooks/usePlayerProfile.js
// =============================================================================
// The central hook for all player data. Any component that needs to read or
// write the player's profile should use this hook.
//
// What it manages:
//   - Loading the profile from Firestore (or local fallback when offline)
//   - Caching the profile in localStorage for instant display on next launch
//   - Automatically refilling cups based on elapsed real-world time
//   - Updating the daily streak counter
//   - Re-syncing the profile when the device comes back online
//   - Spending and earning cups (game currency)
//   - Saving the selected cup skin
//   - Recording level scores and leaderboard entries after a level ends
//
// Auth dependency:
//   The hook watches isLoadingAuth from AuthContext. It does NOT load anything
//   until isLoadingAuth is false. This prevents a race condition where the
//   profile load fires before Firebase has restored the session from IndexedDB.
//
// Offline behavior:
//   - localStorage cache is shown instantly (no spinner if cached)
//   - Firestore cache (IndexedDB) is checked next -- still no network needed
//   - If both miss, a 2.5s network timeout fires and the local profile is used
//   - When `window.online` fires, the profile auto-resyncs from Firestore
//   - All writes go to localStorage first (synchronous), then Firestore async
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { MAX_CUPS, REFILL_INTERVAL_MS } from '@/lib/cupSkins';
import { getLevelConfig } from '@/lib/levelConfig';
import { isDemoMode, getDemoProfile, updateDemoProfile, DEMO_MAX_CUPS } from '@/lib/demoMode';
import { useAuth } from '@/lib/AuthContext';
import {
  getOrCreateProfile,
  updateProfile,
  saveLevelScore,
  saveLeaderboardEntry,
} from '@/lib/firebaseDb';

// localStorage key for the profile cache
const PROFILE_CACHE_KEY = 'puredrop_profile';

// -- localStorage helpers ------------------------------------------------------
// These are synchronous so the cached profile can be read and displayed
// before any async Firestore call completes.
function getCachedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)); }
  catch { return null; }
}
function setCachedProfile(p) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)); }
  catch {}
}

// =============================================================================
// computeStars (exported utility)
// =============================================================================
// Calculates the star rating (0-3) for a completed level based on
// score and catch accuracy. Used in GameOver screen and level score records.
export function computeStars(score, catchRate, win) {
  if (!win) return 0;
  if (score >= 2000 && catchRate >= 0.9) return 3;
  if (score >= 800  || catchRate >= 0.7) return 2;
  return 1;
}

// =============================================================================
// usePlayerProfile
// =============================================================================
export function usePlayerProfile() {
  // -- State -----------------------------------------------------------------
  const [profile, setProfile]   = useState(null);  // the active player profile object
  const [loading, setLoading]   = useState(true);  // true while the first load is in progress
  const [error,   setError]     = useState(null);  // error string if load failed with no fallback

  // Ref mirrors the profile state so async callbacks always see the latest value
  // without needing to capture it in a closure (avoids stale closures in callbacks)
  const profileRef = useRef(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // -- Auth ------------------------------------------------------------------
  // We get the user directly from AuthContext so there is one source of truth.
  // We also keep a ref so callbacks (addCup, spendCup, etc.) can read the
  // latest user without re-creating those callbacks on every auth change.
  const { user: authUser, isLoadingAuth } = useAuth();
  const authUserRef = useRef(authUser);
  useEffect(() => { authUserRef.current = authUser; }, [authUser]);

  // ==========================================================================
  // loadProfile
  // ==========================================================================
  // Core loader. Called exactly once after auth has settled (or when the user
  // comes back online with a local profile that needs syncing).
  //
  // Flow:
  //   1. If demo mode -- serve local demo profile, done.
  //   2. If no user -- nothing to load (sign-in screen will handle it), done.
  //   3. Show localStorage cache immediately if uid matches (no spinner).
  //   4. Call getOrCreateProfile (Firestore cache -> network -> local fallback).
  //   5. Run autoRefill (restore cups based on elapsed time).
  //   6. Run updateStreak (update daily streak counter).
  //   7. Save result to localStorage and update state.
  const loadProfile = useCallback(async (user) => {
    setLoading(true);
    setError(null);

    // -- Demo mode: use local in-memory profile, skip Firestore entirely ------
    if (isDemoMode()) {
      setProfile(getDemoProfile());
      setLoading(false);
      return;
    }

    // -- No authenticated user: nothing to load ----------------------------
    if (!user) {
      setLoading(false);
      return;
    }

    // -- Show cached profile immediately (prevents blank screen) ----------
    // If we have a localStorage entry for this exact user, display it while
    // the Firestore fetch runs in the background. The user sees their cups
    // and skin with zero delay.
    const cached = getCachedProfile();
    if (cached && cached.uid === user.uid) {
      setProfile(cached);
      setLoading(false); // unblock the UI immediately
    }

    // -- Fetch from Firestore (with offline fallback) ----------------------
    try {
      let p = await getOrCreateProfile(user.uid, user.email, user.displayName);

      // Refill cups that accumulated while the app was closed
      p = await autoRefill(p, user.uid);

      // Update daily play streak
      p = await updateStreak(p, user.uid);

      // Persist fresh profile to localStorage for next launch
      setCachedProfile(p);
      setProfile(p);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      console.error('[Profile] load failed:', err);
      // Only show an error state if we have no fallback profile to display.
      // If the localStorage cache was shown above, the user is already playing.
      const hasFallback = profileRef.current;
      if (!hasFallback) setError(msg);
    } finally {
      setLoading(false);
    }
  }, []); // no reactive deps -- receives user as an explicit argument

  // ==========================================================================
  // Auth-gated load trigger
  // ==========================================================================
  // This effect is the ONLY place that calls loadProfile. It fires when:
  //   - Auth finishes loading (isLoadingAuth flips to false), AND
  //   - There is a signed-in user we haven't loaded for yet
  //
  // loadedForUidRef prevents double-loading when React re-renders this
  // effect (e.g. due to an unrelated state change in the parent).
  const loadedForUidRef = useRef(null);

  useEffect(() => {
    // Don't do anything until Firebase has resolved the session
    if (isLoadingAuth) return;

    const uid = authUser ? authUser.uid : null;

    // Demo mode: load immediately regardless of auth state
    if (isDemoMode()) {
      loadProfile(null);
      return;
    }

    // Signed-in user we haven't loaded for yet -- kick off the load
    if (uid && uid !== loadedForUidRef.current) {
      loadedForUidRef.current = uid;
      loadProfile(authUser);
      return;
    }

    // Auth settled with no user (sign-in screen is shown) -- stop the spinner
    if (!uid) {
      setLoading(false);
    }
  }, [isLoadingAuth, authUser, loadProfile]);

  // ==========================================================================
  // Online re-sync listener
  // ==========================================================================
  // When the device comes back online and the active profile is a local-only
  // fallback (_local: true), re-run loadProfile to pull fresh data from
  // Firestore and merge any queued writes.
  useEffect(() => {
    const handleOnline = () => {
      const p    = profileRef.current;
      const user = authUserRef.current;
      if (p && p._local && user) {
        console.log('[Profile] Back online -- resyncing local profile with Firestore');
        loadProfile(user);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadProfile]);

  // ==========================================================================
  // autoRefill (private)
  // ==========================================================================
  // Cups refill automatically over real-world time even when the app is closed.
  // Each cup takes REFILL_INTERVAL_MS milliseconds to refill.
  // We calculate how many cups should have refilled since last_refill_time and
  // update the profile accordingly. If cups are already at max, no-op.
  const autoRefill = async (p, uid) => {
    const now  = Date.now();
    const last = new Date(p.last_refill_time).getTime();
    if (isNaN(last)) return p;

    const cupsToAdd = Math.floor((now - last) / REFILL_INTERVAL_MS);
    if (cupsToAdd > 0 && p.cups < MAX_CUPS) {
      const newCups       = Math.min(MAX_CUPS, p.cups + cupsToAdd);
      // Advance last_refill_time by exactly the consumed intervals
      // (not just 'now') so we don't lose partial interval progress
      const newLastRefill = new Date(last + cupsToAdd * REFILL_INTERVAL_MS).toISOString();
      try {
        return await updateProfile(uid, { cups: newCups, last_refill_time: newLastRefill });
      } catch {
        return p; // if the write fails, return the original profile unchanged
      }
    }
    return p;
  };

  // ==========================================================================
  // updateStreak (private)
  // ==========================================================================
  // Increments the daily play streak when the user plays on consecutive days.
  // - Played yesterday: streak + 1
  // - Skipped a day or more: streak resets to 1
  // - Already played today: no-op (streak is already current)
  const updateStreak = async (p, uid) => {
    const today     = new Date().toDateString();
    if (p.last_play_date === today) return p; // already updated today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = p.last_play_date === yesterday ? (p.streak || 0) + 1 : 1;
    try {
      return await updateProfile(uid, { streak: newStreak, last_play_date: today });
    } catch {
      return p;
    }
  };

  // ==========================================================================
  // spendCup
  // ==========================================================================
  // Deducts one cup when the player starts a level.
  // Returns true on success, false if no cups are available.
  // Optimistically updates the UI before the Firestore write completes
  // and rolls back on failure.
  const spendCup = useCallback(async () => {
    const p = profileRef.current;
    if (!p || p.cups <= 0) return false;

    const newCups = p.cups - 1;

    // Demo mode: update in-memory demo profile only
    if (isDemoMode()) {
      setProfile(updateDemoProfile({ cups: newCups }));
      return true;
    }

    // Optimistic UI update -- player sees the cup deducted immediately
    setProfile(prev => ({ ...prev, cups: newCups }));

    try {
      const updated = await updateProfile(p.id, { cups: newCups });
      setProfile(updated); // replace optimistic with server-confirmed value
      return true;
    } catch (err) {
      console.error('[Profile] spendCup failed:', err);
      setProfile(p); // rollback to original on failure
      return false;
    }
  }, []);

  // ==========================================================================
  // addCup
  // ==========================================================================
  // Awards cups to the player (e.g. after watching a rewarded ad).
  // Hard-capped at MAX_CUPS (5) so cups can never exceed the maximum.
  // If the profile is not yet loaded, waits up to 2 seconds before giving up.
  const addCup = useCallback(async (amount) => {
    const n = amount !== undefined ? amount : 1;

    // Wait for profile if it's not ready yet (e.g. ad finished before profile loaded)
    let p = profileRef.current;
    if (!p) {
      await new Promise(r => setTimeout(r, 2000));
      p = profileRef.current;
      if (!p) {
        console.error('[Profile] addCup: profile still null after 2s -- skipping');
        return;
      }
    }

    // Hard cup cap: never exceed MAX_CUPS (5) or DEMO_MAX_CUPS in demo mode
    const cap     = isDemoMode() ? DEMO_MAX_CUPS : MAX_CUPS;
    const newCups = Math.min(cap, p.cups + n);

    if (isDemoMode()) {
      setProfile(updateDemoProfile({ cups: newCups }));
      return;
    }

    // Optimistic UI update
    setProfile(prev => ({ ...prev, cups: newCups }));

    try {
      const updated = await updateProfile(p.id, { cups: newCups });
      setProfile(updated);
    } catch (err) {
      console.error('[Profile] addCup failed:', err);
      setProfile(p); // rollback
    }
  }, []);

  // ==========================================================================
  // setSkin
  // ==========================================================================
  // Saves the player's selected cup skin to both localStorage and Firestore.
  // Optimistically updates the UI immediately so the cup changes appear
  // without waiting for the network.
  const setSkin = useCallback(async (skinId) => {
    const p = profileRef.current;
    if (!p) return;

    if (isDemoMode()) {
      setProfile(updateDemoProfile({ selected_cup_skin: skinId }));
      return;
    }

    // Optimistic update to localStorage and state
    const optimistic = { ...p, selected_cup_skin: skinId };
    setProfile(optimistic);
    setCachedProfile(optimistic);

    try {
      const updated = await updateProfile(p.id, { selected_cup_skin: skinId });
      setProfile(updated);
      setCachedProfile(updated);
    } catch (err) {
      console.error('[Profile] setSkin failed:', err);
      // Don't roll back skin selection -- it's a cosmetic change
    }
  }, []);

  // ==========================================================================
  // updateProgress
  // ==========================================================================
  // Called at the end of every level to persist the results.
  // Does three things:
  //   1. Updates the player's total score and highest level in their profile
  //   2. Appends a row to the levelScores collection (per-level history)
  //   3. Adds an entry to the leaderboard (only if the player won AND has not
  //      opted out of the leaderboard via Settings)
  const updateProgress = useCallback(async (level, score, win, catchRate) => {
    const rate = catchRate !== undefined ? catchRate : 0;
    const p    = profileRef.current;
    if (!p) return;

    // Build the profile field updates
    const updates = { total_score: (p.total_score || 0) + score };
    if (win && level >= (p.highest_level || 1)) {
      const nextLevel         = level + 1;
      updates.highest_level   = nextLevel;
      updates.difficulty_tier = getLevelConfig(nextLevel).tier;
    }

    if (isDemoMode()) {
      setProfile(updateDemoProfile(updates));
      return;
    }

    // Apply locally FIRST so the UI (level unlock, total score) reflects the
    // result immediately, even when offline. The server sync below is
    // best-effort -- if it fails, the local state still moves forward and
    // Firestore's offline write queue will replay when connectivity returns.
    const optimistic = { ...p, ...updates };
    setProfile(optimistic);

    try {
      // Update profile (total score + highest level)
      const updated = await updateProfile(p.id, updates);
      setProfile(updated);

      // Save level completion record (win/loss, stars, accuracy)
      const user = authUserRef.current;
      if (!user) return;
      const stars = computeStars(score, rate, win);
      await saveLevelScore(user.uid, user.email, level, score, win, stars, rate);

      // Add to leaderboard only if the player won and hasn't opted out
      if (win && !p.hide_from_leaderboard) {
        await saveLeaderboardEntry(
          user.uid,
          user.email,
          user.displayName || user.email.split('@')[0],
          level,
          score,
        );
      }
    } catch (err) {
      // Firestore queues offline writes automatically -- they'll flush on
      // reconnect. The optimistic update above is what the UI sees in the
      // meantime, so airplane mode still unlocks the next level.
      console.warn('[Profile] updateProgress: server sync deferred (offline?):', err?.message || err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================================================
  // nextRefillIn (computed)
  // ==========================================================================
  // Returns a human-readable countdown string (e.g. "0h 14m 32s") until the
  // next cup refills. Returns null when cups are already at max.
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

  // ==========================================================================
  // reload
  // ==========================================================================
  // Manually re-fetches the profile from Firestore.
  // Used by components like the Settings modal to refresh after account changes.
  const reload = useCallback(() => {
    const user = authUserRef.current;
    if (user) loadProfile(user);
  }, [loadProfile]);

  // -- Public API -------------------------------------------------------------
  return {
    profile,        // the player profile object (or null while loading)
    loading,        // true during the initial load
    error,          // error string if load failed with no fallback
    spendCup,       // fn() -> bool: spend 1 cup to play a level
    addCup,         // fn(amount?) -> void: add cups (e.g. from ad reward)
    setSkin,        // fn(skinId) -> void: change the active cup skin
    updateProgress, // fn(level, score, win, catchRate) -> void: save level results
    nextRefillIn,   // string | null: countdown to next cup refill
    reload,         // fn() -> void: force re-fetch from Firestore
  };
}
