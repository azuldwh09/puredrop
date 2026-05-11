import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

const BASE_URL = 'https://pure-rain-catch.base44.app';

// Keys for local storage
const KEYS = {
  PLAYER_PROFILE: 'puredrop_player_profile',
  LEVEL_SCORES: 'puredrop_level_scores',
  PENDING_SYNC: 'puredrop_pending_sync',
  LEADERBOARD: 'puredrop_leaderboard',
};

// Save data locally
export async function saveLocal(key, data) {
  await Preferences.set({ key, value: JSON.stringify(data) });
}

// Load data locally
export async function loadLocal(key) {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
}

// Check network status
export async function isOnline() {
  const status = await Network.getStatus();
  return status.connected;
}

// Queue an action for sync when back online
export async function queueSync(action) {
  const existing = await loadLocal(KEYS.PENDING_SYNC) || [];
  existing.push({ ...action, timestamp: Date.now() });
  await saveLocal(KEYS.PENDING_SYNC, existing);
}

// Flush pending sync queue to server
export async function flushSyncQueue(authToken) {
  const online = await isOnline();
  if (!online) return;

  const pending = await loadLocal(KEYS.PENDING_SYNC) || [];
  if (pending.length === 0) return;

  const failed = [];
  for (const action of pending) {
    try {
      const res = await fetch(`${BASE_URL}/api/entities/${action.entity}`, {
        method: action.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(action.data),
      });
      if (!res.ok) failed.push(action);
    } catch {
      failed.push(action);
    }
  }

  await saveLocal(KEYS.PENDING_SYNC, failed);
  console.log(`Synced ${pending.length - failed.length} actions, ${failed.length} failed.`);
}

// Save player profile locally (and sync if online)
export async function savePlayerProfile(profile, authToken) {
  await saveLocal(KEYS.PLAYER_PROFILE, profile);
  const online = await isOnline();
  if (online) {
    await fetch(`${BASE_URL}/api/entities/PlayerProfile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(profile),
    }).catch(() => queueSync({ entity: 'PlayerProfile', method: 'POST', data: profile }));
  } else {
    await queueSync({ entity: 'PlayerProfile', method: 'POST', data: profile });
  }
}

// Save level score locally (and sync if online)
export async function saveLevelScore(score, authToken) {
  const existing = await loadLocal(KEYS.LEVEL_SCORES) || [];
  existing.push(score);
  await saveLocal(KEYS.LEVEL_SCORES, existing);

  const online = await isOnline();
  if (online) {
    await fetch(`${BASE_URL}/api/entities/LevelScore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(score),
    }).catch(() => queueSync({ entity: 'LevelScore', method: 'POST', data: score }));
  } else {
    await queueSync({ entity: 'LevelScore', method: 'POST', data: score });
  }
}

// Load player profile (local first, then remote)
export async function getPlayerProfile(authToken) {
  const local = await loadLocal(KEYS.PLAYER_PROFILE);
  const online = await isOnline();
  if (!online) return local;

  try {
    const res = await fetch(`${BASE_URL}/api/entities/PlayerProfile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    await saveLocal(KEYS.PLAYER_PROFILE, data);
    return data;
  } catch {
    return local;
  }
}

// Load leaderboard (local cache fallback)
export async function getLeaderboard(authToken) {
  const local = await loadLocal(KEYS.LEADERBOARD);
  const online = await isOnline();
  if (!online) return local || [];

  try {
    const res = await fetch(`${BASE_URL}/api/entities/Leaderboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    await saveLocal(KEYS.LEADERBOARD, data);
    return data;
  } catch {
    return local || [];
  }
}

export { KEYS };
