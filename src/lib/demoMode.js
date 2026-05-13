// =============================================================================
// DEMO MODE -- src/lib/demoMode.js
// =============================================================================
// Demo mode lets players try the game without signing in.
// All profile data lives in memory (and localStorage) only -- nothing is
// synced to Firestore, and scores are excluded from the leaderboard.
//
// When demo mode is active, isDemoMode() returns true and usePlayerProfile
// uses getDemoProfile() / updateDemoProfile() instead of Firestore.
//
// Demo mode is stored in localStorage so it survives a page refresh without
// forcing the user to re-choose "Play without signing in".
// It is cleared by disableDemoMode() when the user signs in.
// =============================================================================

// localStorage key that signals demo mode is active
const DEMO_KEY = 'puredrop_demo';

// Maximum cups allowed in demo mode (same as normal play)
export const DEMO_MAX_CUPS = 5;

// Maximum level a guest (demo) player can reach before being prompted to sign in
export const DEMO_MAX_LEVEL = 5;

// -- Profile shape for demo players -------------------------------------------
// A plain in-memory object that mirrors the Firestore profile shape so the
// rest of the app can treat it identically.
let _demoProfile = null;

function buildDemoProfile() {
  return {
    id:                   'demo',
    uid:                  'demo',
    user_email:           'demo@local',
    display_name:         'Guest',
    cups:                 DEMO_MAX_CUPS,
    last_refill_time:     new Date().toISOString(),
    selected_cup_skin:    'classic',
    highest_level:        1,
    total_score:          0,
    streak:               0,
    last_play_date:       new Date().toDateString(),
    difficulty_tier:      1,
    hide_from_leaderboard: true, // demo scores never appear on the leaderboard
    _local:               true,
  };
}

// =============================================================================
// isDemoMode
// =============================================================================
// Returns true if the player is currently in demo (guest) mode.
export function isDemoMode() {
  try { return localStorage.getItem(DEMO_KEY) === '1'; }
  catch { return false; }
}

// =============================================================================
// enableDemoMode
// =============================================================================
// Called when the player taps "Play without signing in".
// Initializes an in-memory demo profile and marks demo mode in localStorage.
export function enableDemoMode() {
  try { localStorage.setItem(DEMO_KEY, '1'); } catch {}
  _demoProfile = buildDemoProfile();
}

// =============================================================================
// disableDemoMode
// =============================================================================
// Called when the player signs in. Clears the demo flag and discards the
// in-memory profile (the real Firestore profile will be loaded instead).
export function disableDemoMode() {
  try { localStorage.removeItem(DEMO_KEY); } catch {}
  _demoProfile = null;
}

// =============================================================================
// getDemoProfile
// =============================================================================
// Returns the current demo profile. Creates a fresh one if it doesn't exist
// yet (e.g. after a page refresh with demo mode still flagged in localStorage).
export function getDemoProfile() {
  if (!_demoProfile) _demoProfile = buildDemoProfile();
  return _demoProfile;
}

// =============================================================================
// updateDemoProfile
// =============================================================================
// Applies partial updates to the in-memory demo profile and returns the
// updated profile. This is the demo-mode equivalent of Firestore's updateProfile.
export function updateDemoProfile(updates) {
  if (!_demoProfile) _demoProfile = buildDemoProfile();
  _demoProfile = { ..._demoProfile, ...updates };
  return _demoProfile;
}
