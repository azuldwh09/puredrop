// Offline-first local storage layer for PureDrop.
// Caches player profile and queues mutations when offline.

const PROFILE_KEY = 'puredrop_profile';
const SYNC_QUEUE_KEY = 'puredrop_sync_queue';
const USER_KEY = 'puredrop_user';

// ── Profile cache ──────────────────────────────────────────────────────────

export function getCachedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

// ── User cache ─────────────────────────────────────────────────────────────

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

// ── Sync queue ─────────────────────────────────────────────────────────────
// Each item: { id, type, payload, timestamp }

export function getSyncQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSyncQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function enqueueSyncItem(type, payload) {
  const queue = getSyncQueue();
  // For profile updates, replace any existing pending update (coalesce)
  if (type === 'profile_update') {
    const idx = queue.findIndex(i => i.type === 'profile_update');
    if (idx !== -1) {
      queue[idx] = { ...queue[idx], payload: { ...queue[idx].payload, ...payload }, timestamp: Date.now() };
      setSyncQueue(queue);
      return;
    }
  }
  queue.push({ id: Date.now() + Math.random(), type, payload, timestamp: Date.now() });
  setSyncQueue(queue);
}

export function removeSyncItem(id) {
  const queue = getSyncQueue().filter(i => i.id !== id);
  setSyncQueue(queue);
}

export function clearSyncQueue() {
  setSyncQueue([]);
}

// ── Online detection ───────────────────────────────────────────────────────

export function isOnline() {
  return navigator.onLine;
}