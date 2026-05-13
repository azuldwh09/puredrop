// =============================================================================
// LOCAL SCORES -- src/lib/localScores.js
// =============================================================================
// Local-first persistence for per-level score & star data.
//
// Why local-first:
//   - Stars and high scores must appear instantly when a level ends, regardless
//     of network state. Round-trips to Firestore are too slow and unreliable
//     (especially in airplane mode).
//   - The player's progression must survive offline play sessions and sync
//     back to Firestore when connectivity returns.
//
// Storage shape (localStorage key: "puredrop_level_scores_v1"):
//   {
//     "<uid>": {
//       "<level>": { stars: 0..3, highScore: number, lastPlayed: ISOString,
//                    accuracy: 0..1, win: bool, plays: number },
//       ...
//     }
//   }
//
// We namespace by UID so multiple players on the same device do not overwrite
// each other. The special UID "demo" is used for guest play.
// =============================================================================

const STORAGE_KEY = 'puredrop_level_scores_v1';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // QuotaExceeded or private-mode WebView -- log and continue.
    console.warn('[localScores] writeAll failed:', err && (err.message || err));
  }
}

function ensureUserBucket(data, uid) {
  if (!data[uid]) data[uid] = {};
  return data[uid];
}

// Returns the entire { [level]: record } map for a user.
export function getAllForUser(uid) {
  if (!uid) return {};
  const all = readAll();
  return all[uid] || {};
}

// Returns one level's record or null.
export function getLevelRecord(uid, level) {
  if (!uid || typeof level !== 'number') return null;
  const bucket = getAllForUser(uid);
  return bucket[level] || null;
}

// Merge a fresh level result into local storage. Keeps the BEST of each field.
// Returns the merged record so callers can update React state synchronously.
export function recordLevelResult(uid, level, score, stars, win, accuracy) {
  if (!uid || typeof level !== 'number') return null;
  const data    = readAll();
  const bucket  = ensureUserBucket(data, uid);
  const prev    = bucket[level] || { stars: 0, highScore: 0, plays: 0, win: false, accuracy: 0 };
  const merged  = {
    stars:      Math.max(prev.stars ?? 0,     stars ?? 0),
    highScore:  Math.max(prev.highScore ?? 0, score ?? 0),
    win:        Boolean(prev.win) || Boolean(win),
    accuracy:   Math.max(prev.accuracy ?? 0,  accuracy ?? 0),
    plays:      (prev.plays ?? 0) + 1,
    lastPlayed: new Date().toISOString(),
  };
  bucket[level] = merged;
  writeAll(data);
  return merged;
}

// Merge an array of remote Firestore records into local. Best-of-each fields.
export function mergeRemoteScores(uid, remoteArr) {
  if (!uid || !Array.isArray(remoteArr) || remoteArr.length === 0) {
    return getAllForUser(uid);
  }
  const data   = readAll();
  const bucket = ensureUserBucket(data, uid);
  for (const r of remoteArr) {
    const lvl = r && r.level;
    if (typeof lvl !== 'number') continue;
    const prev = bucket[lvl] || { stars: 0, highScore: 0, plays: 0, win: false, accuracy: 0 };
    bucket[lvl] = {
      stars:      Math.max(prev.stars ?? 0,     r.stars ?? 0),
      highScore:  Math.max(prev.highScore ?? 0, r.score ?? 0),
      win:        Boolean(prev.win) || Boolean(r.win),
      accuracy:   Math.max(prev.accuracy ?? 0,  r.accuracy ?? 0),
      plays:      prev.plays ?? 0,
      lastPlayed: prev.lastPlayed || null,
    };
  }
  writeAll(data);
  return bucket;
}

// JSON-safe snapshot of a user's local progress.
export function exportForBackup(uid) {
  return { uid, scores: getAllForUser(uid), exported_at: new Date().toISOString() };
}

// Wipe local data for one user (other users on the device are untouched).
export function clearForUser(uid) {
  if (!uid) return;
  const data = readAll();
  delete data[uid];
  writeAll(data);
}
