// Local mode — for unauthenticated players.
// Progress is stored in localStorage so it persists across page refreshes,
// but is never synced to the server. No leaderboard participation.

import { MAX_CUPS } from '@/lib/cupSkins';

const STORAGE_KEY = 'puredrop_local_profile';

const DEFAULT_PROFILE = {
  id: 'local',
  user_email: 'local@puredrop.app',
  cups: MAX_CUPS,
  last_refill_time: new Date().toISOString(),
  selected_cup_skin: 'classic',
  highest_level: 1,
  total_score: 0,
  streak: 0,
  last_play_date: new Date().toDateString(),
  difficulty_tier: 1,
};

// No level cap — local mode players can beat all levels
export const DEMO_MAX_LEVEL = Infinity;
// Reuse the same cup limit as online players
export const DEMO_MAX_CUPS = MAX_CUPS;

function loadLocalProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PROFILE };
}

function saveLocalProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

let _localProfile = loadLocalProfile();

export function isDemoMode() {
  try {
    return sessionStorage.getItem('puredrop_demo') === '1';
  } catch {
    return false;
  }
}

export function enableDemoMode() {
  try { sessionStorage.setItem('puredrop_demo', '1'); } catch {}
  _localProfile = loadLocalProfile();
}

export function disableDemoMode() {
  try { sessionStorage.removeItem('puredrop_demo'); } catch {}
}

export function getDemoProfile() {
  return { ..._localProfile };
}

export function updateDemoProfile(updates) {
  _localProfile = { ..._localProfile, ...updates };
  saveLocalProfile(_localProfile);
  return { ..._localProfile };
}