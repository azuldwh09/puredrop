import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

const BASE_URL = 'https://pure-rain-catch.base44.app';

const KEYS = {
  PLAYER_PROFILE: 'puredrop_player_profile',
  LEVEL_SCORES: 'puredrop_level_scores',
  PENDING_SYNC: 'puredrop_pending_sync',
  LEADERBOARD: 'puredrop_leaderboard',
};

export async function saveLocal(key, data) {
  await Preferences.set({ key, value: JSON.stringify(data) });
}

export async function loadLocal(key) {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
}

export async function isOnline() {
  const status = await Network.getStatus();
  return status.connected;
}

export async function queueSync(action) {
  const existing = await loadLocal(KEYS.PENDING_SYNC) || [];
  existing.push({ ...action, timestamp: Date.now() });
  await saveLocal(KEYS.PENDING_SYNC, existing);
}

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(action.data),
      });
      if (!res.ok) failed.push(action);
    } catch {
      failed.push(action);
    }
  }
  await saveLocal(KEYS.PENDING_SYNC, failed);
  console.log(`[PureDrop] Synced ${pending.length - failed.length} queued actions, ${failed.length} failed.`);
}

// Save/sync PlayerProfile — all fields matching Base44 entity
export async function savePlayerProfile(profileRecord, authToken) {
  await saveLocal(KEYS.PLAYER_PROFILE, profileRecord);
  const online = await isOnline();
  if (online) {
    await fetch(`${BASE_URL}/api/entities/PlayerProfile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(profileRecord),
    }).catch(() => queueSync({ entity: 'PlayerProfile', method: 'POST', data: profileRecord }));
  } else {
    await queueSync({ entity: 'PlayerProfile', method: 'POST', data: profileRecord });
  }
}

// Save/sync LevelScore — matches Base44 LevelScore entity
export async function saveLevelScore(scoreRecord, authToken) {
  // scoreRecord: { user_email, level, score, purity, win, stars, accuracy }
  const existing = await loadLocal(KEYS.LEVEL_SCORES) || [];
  existing.push({ ...scoreRecord, saved_at: Date.now() });
  await saveLocal(KEYS.LEVEL_SCORES, existing);

  const online = await isOnline();
  if (online) {
    await fetch(`${BASE_URL}/api/entities/LevelScore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(scoreRecord),
    }).catch(() => queueSync({ entity: 'LevelScore', method: 'POST', data: scoreRecord }));
  } else {
    await queueSync({ entity: 'LevelScore', method: 'POST', data: scoreRecord });
  }
}

// Update Leaderboard entry — matches Base44 Leaderboard entity
export async function updateLeaderboard(entry, authToken) {
  // entry: { user_email, display_name, level, score, purity }
  const online = await isOnline();
  if (online) {
    await fetch(`${BASE_URL}/api/entities/Leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(entry),
    }).catch(() => queueSync({ entity: 'Leaderboard', method: 'POST', data: entry }));
  } else {
    await queueSync({ entity: 'Leaderboard', method: 'POST', data: entry });
  }
}

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
