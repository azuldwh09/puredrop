// =============================================================================
// FIRESTORE DATABASE HELPERS -- src/lib/firebaseDb.js
// =============================================================================
// All reads and writes to Firestore go through this file.
// It is the ONLY place in the app that talks to the database.
//
// Collections:
//   playerProfiles  -- one document per user, keyed by Firebase UID
//   levelScores     -- append-only log of every level completion
//   leaderboard     -- top scores, used by the Leaderboard screen
//
// Offline-first strategy (three-layer cache):
//   Layer 1: localStorage  -- written synchronously on every update.
//            Survives app kills. Read back instantly with zero async cost.
//   Layer 2: Firestore cache (IndexedDB) -- Firestore's built-in offline
//            persistence. Available after the first successful network read.
//            Served via getDocFromCache() with no timeout.
//   Layer 3: Firestore network -- live read from Firestore servers.
//            Wrapped in a 2.5-second timeout so we don't block the game
//            indefinitely when the device has no internet.
//
//   On a write: localStorage is updated synchronously first, then Firestore
//   is updated async. If the device is offline, Firestore queues the write
//   internally and auto-syncs when connectivity is restored.
//
//   On a read (getOrCreateProfile):
//     1. Try Firestore cache  -> instant, no network needed
//     2. Try network (2.5s timeout)  -> fresh data when online
//     3. Try localStorage   -> works after any previous successful load
//     4. Build a brand-new local profile  -> first-ever offline launch
// =============================================================================

import { getFirestore } from '@/lib/firebaseAuth';
import { MAX_CUPS } from '@/lib/cupSkins';

// How long to wait for a Firestore network response before falling back offline
const FIRESTORE_TIMEOUT_MS = 2500;

// =============================================================================
// Internal: withTimeout
// =============================================================================
// Wraps a promise with a maximum wait time. If the promise hasn't resolved
// by `ms` milliseconds, rejects with an error flagged as `offline: true`.
// This prevents the game from blocking indefinitely when there is no internet.
function withTimeout(promise, ms) {
  const timeout = ms !== undefined ? ms : FIRESTORE_TIMEOUT_MS;
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      var t = setTimeout(function () {
        var e = new Error('Firestore timed out after ' + timeout + 'ms (device offline?)');
        e.offline = true;
        reject(e);
      }, timeout);
      // Node.js: don't keep the process alive just for this timer
      if (t && t.unref) t.unref();
    }),
  ]);
}

// =============================================================================
// getOrCreateProfile
// =============================================================================
// Main entry point for loading a player profile.
//
// On success: returns the profile object with an `id` field equal to the UID.
// On offline: returns a local profile sourced from localStorage (if available)
//             or a freshly constructed default profile. The returned object
//             will have `_local: true` so callers know it hasn't been server-
//             confirmed yet. usePlayerProfile watches for `window.online` and
//             re-syncs when connectivity is restored.
//
// Profile shape:
//   uid, user_email, display_name, cups, last_refill_time,
//   selected_cup_skin, highest_level, total_score, streak,
//   last_play_date, difficulty_tier, hide_from_leaderboard
export async function getOrCreateProfile(uid, email, displayName) {

  // -- Step 1: Get Firestore instance ----------------------------------------
  var db;
  try {
    db = await getFirestore();
  } catch (dbErr) {
    // Firestore itself failed to initialize (e.g. no IndexedDB on device)
    console.warn('[DB] Firestore init failed, returning local profile:', dbErr && dbErr.message);
    return buildLocalProfile(uid, email, displayName);
  }

  // -- Step 2: Import Firestore functions (lazy for bundle size) -------------
  var firestoreModule;
  try {
    firestoreModule = await import('firebase/firestore');
  } catch (modErr) {
    console.warn('[DB] Firestore module import failed:', modErr && modErr.message);
    return buildLocalProfile(uid, email, displayName);
  }

  var doc            = firestoreModule.doc;
  var getDoc         = firestoreModule.getDoc;
  var getDocFromCache = firestoreModule.getDocFromCache;
  var setDoc         = firestoreModule.setDoc;
  var serverTimestamp = firestoreModule.serverTimestamp;
  var ref = doc(db, 'playerProfiles', uid);

  // -- Step 3: Try Firestore's local cache first (instant, works offline) ----
  // Firestore stores documents in IndexedDB after the first successful network
  // read. On subsequent launches, this returns the cached version immediately.
  try {
    var cacheSnap = await getDocFromCache(ref);
    if (cacheSnap.exists()) {
      return { id: uid, ...cacheSnap.data() };
    }
    // Cache miss -- doc was never fetched or cache was cleared
  } catch (cacheErr) {
    // getDocFromCache throws when the cache is not initialized yet (first launch)
    // That is expected -- fall through to network
  }

  // -- Step 4: Try live network read (with 2.5s timeout) --------------------
  // This is the primary path on a normal online launch.
  try {
    var netSnap = await withTimeout(getDoc(ref));
    if (netSnap.exists()) {
      // Document found -- return it
      return { id: uid, ...netSnap.data() };
    }
    // Document does not exist yet -- fall through to create it
  } catch (netErr) {
    if (netErr.offline) {
      // Timed out -- device is offline and Firestore cache was empty
      // Build from localStorage or construct a fresh default profile
      console.warn('[DB] Offline and no Firestore cache -- using local profile');
      return buildLocalProfile(uid, email, displayName);
    }
    // Some other Firestore error (e.g. permission denied) -- bubble it up
    throw netErr;
  }

  // -- Step 5: First-time user -- create their profile in Firestore ----------
  // We reach here only when the document genuinely doesn't exist yet
  // (new user, or user cleared their account).
  var newProfile = {
    uid:                  uid,
    user_email:           email,
    display_name:         displayName || (email ? email.split('@')[0] : 'Player'),
    cups:                 MAX_CUPS,
    last_refill_time:     new Date().toISOString(),
    selected_cup_skin:    'classic',
    highest_level:        1,
    total_score:          0,
    streak:               1,
    last_play_date:       new Date().toDateString(),
    difficulty_tier:      1,
    hide_from_leaderboard: false,
    created_at:           serverTimestamp(),
  };

  try {
    await setDoc(ref, newProfile);
  } catch (writeErr) {
    // If the write failed because we are offline, Firestore will queue it
    // and sync automatically when connectivity is restored.
    var isOffline = writeErr && (
      writeErr.code === 'unavailable' ||
      (writeErr.message && writeErr.message.includes('offline'))
    );
    if (isOffline) {
      var localProfile = { id: uid, ...newProfile, _local: true };
      setCachedProfileDirect(localProfile);  // persist to localStorage immediately
      return localProfile;
    }
    throw writeErr;
  }

  return { id: uid, ...newProfile };
}

// =============================================================================
// Internal: buildLocalProfile
// =============================================================================
// Constructs a profile object without touching Firestore.
// Priority order:
//   1. localStorage ('puredrop_profile') -- if the uid matches
//   2. A brand-new default profile (first ever offline launch)
// The returned object always has _local: true to signal it needs a server sync.
function buildLocalProfile(uid, email, displayName) {
  try {
    var raw = localStorage.getItem('puredrop_profile');
    if (raw) {
      var cached = JSON.parse(raw);
      // Only use the cached profile if it belongs to this user
      // (prevents using a stale profile from a different account)
      if (!cached.uid || cached.uid === uid) {
        return { ...cached, uid: uid, id: uid, _local: true };
      }
    }
  } catch (e) {
    // localStorage read failed (e.g. storage quota exceeded, corrupted JSON)
    console.warn('[DB] localStorage read failed:', e && e.message);
  }

  // No usable cached data -- build a fresh default profile
  return {
    id:                   uid,
    uid:                  uid,
    user_email:           email,
    display_name:         displayName || (email ? email.split('@')[0] : 'Player'),
    cups:                 MAX_CUPS,
    last_refill_time:     new Date().toISOString(),
    selected_cup_skin:    'classic',
    highest_level:        1,
    total_score:          0,
    streak:               0,
    last_play_date:       new Date().toDateString(),
    difficulty_tier:      1,
    hide_from_leaderboard: false,
    _local:               true,
  };
}

// Internal: write profile to localStorage only (no Firestore call)
function setCachedProfileDirect(p) {
  try { localStorage.setItem('puredrop_profile', JSON.stringify(p)); } catch (e) {}
}

// =============================================================================
// updateProfile
// =============================================================================
// Writes partial updates to a player's profile.
//
// Strategy:
//   1. Merge + write to localStorage SYNCHRONOUSLY (instant, works offline)
//   2. Fire updateDoc to Firestore ASYNC (queued if offline, synced later)
//   3. Read back the updated document from cache or network to return fresh data
//
// The cup count is hard-capped at MAX_CUPS (5) on every write so it can never
// exceed the maximum even if a bug passes in a higher value.
export async function updateProfile(uid, updates) {

  // -- Step 1: Write to localStorage immediately (synchronous) ---------------
  try {
    var raw    = localStorage.getItem('puredrop_profile');
    var cached = raw ? JSON.parse(raw) : { uid: uid };
    var merged = Object.assign({}, cached, updates);

    // Enforce cup cap at the storage layer as a hard safety net
    if (typeof merged.cups === 'number' && merged.cups > MAX_CUPS) {
      merged.cups = MAX_CUPS;
      updates = Object.assign({}, updates, { cups: MAX_CUPS });
    }

    localStorage.setItem('puredrop_profile', JSON.stringify(merged));
  } catch (e) {
    // If localStorage fails, keep going -- Firestore write below still works
  }

  // -- Step 2: Get Firestore and write ---------------------------------------
  var db;
  try {
    db = await getFirestore();
  } catch (e) {
    // Firestore unavailable -- return the locally merged state
    var localFallback = localStorage.getItem('puredrop_profile');
    return localFallback ? JSON.parse(localFallback) : { id: uid, uid: uid, ...updates };
  }

  var firestoreModule    = await import('firebase/firestore');
  var doc                = firestoreModule.doc;
  var updateDoc          = firestoreModule.updateDoc;
  var getDoc             = firestoreModule.getDoc;
  var getDocFromCache    = firestoreModule.getDocFromCache;
  var ref = doc(db, 'playerProfiles', uid);

  // updateDoc sends only the changed fields (no full document overwrite)
  try {
    await updateDoc(ref, updates);
  } catch (writeErr) {
    var code = writeErr && writeErr.code;
    var msg  = writeErr && writeErr.message;
    var isOfflineErr = code === 'unavailable' ||
      (msg && (msg.includes('offline') || msg.includes('client is offline')));

    if (isOfflineErr) {
      // Firestore will retry automatically when back online.
      // Return the locally merged state so the UI stays responsive.
      var localRaw = localStorage.getItem('puredrop_profile');
      return localRaw ? JSON.parse(localRaw) : { id: uid, uid: uid, ...updates };
    }
    throw writeErr;
  }

  // -- Step 3: Read back the latest state ------------------------------------
  // Try cache first (instant), then network (with timeout)
  try {
    var cacheSnap = await getDocFromCache(ref);
    if (cacheSnap.exists()) return { id: uid, ...cacheSnap.data() };
  } catch (e) { /* cache miss -- fall through */ }

  try {
    var netSnap = await withTimeout(getDoc(ref));
    return { id: uid, ...netSnap.data() };
  } catch (e) {
    // Network read failed -- return localStorage state as final fallback
    var fallbackRaw = localStorage.getItem('puredrop_profile');
    return fallbackRaw ? JSON.parse(fallbackRaw) : { id: uid, uid: uid, ...updates };
  }
}

// =============================================================================
// getProfile
// =============================================================================
// One-time read of a player profile (used by SettingsModal and similar screens
// that need the profile on demand rather than subscribing to live updates).
// Does not modify localStorage or create a new profile.
export async function getProfile(uid) {
  var db;
  try { db = await getFirestore(); } catch (e) { return null; }

  var m   = await import('firebase/firestore');
  var ref = m.doc(db, 'playerProfiles', uid);

  // Try Firestore cache first (instant)
  try {
    var cacheSnap = await m.getDocFromCache(ref);
    if (cacheSnap.exists()) return { id: uid, ...cacheSnap.data() };
  } catch (e) { /* cache miss */ }

  // Fall back to network with timeout
  try {
    var netSnap = await withTimeout(m.getDoc(ref));
    if (!netSnap.exists()) return null;
    return { id: uid, ...netSnap.data() };
  } catch (e) { return null; }
}

// =============================================================================
// deleteProfile
// =============================================================================
// Permanently deletes the player profile document from Firestore.
// Used by the "Delete my account" flow in SettingsModal.
export async function deleteProfile(uid) {
  var db = await getFirestore();
  var { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'playerProfiles', uid));
}

// =============================================================================
// saveLevelScore
// =============================================================================
// Appends one record to the levelScores collection each time a level ends.
// This is a write-and-forget operation -- failures are silently swallowed
// because losing a score record is not catastrophic.
// If offline, Firestore queues the write and syncs when back online.
export async function saveLevelScore(uid, email, level, score, win, stars, accuracy) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }

  var { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'levelScores'), {
      uid:        uid,
      user_email: email,
      level:      level,
      score:      score,
      win:        win,
      stars:      stars,
      accuracy:   accuracy,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[DB] saveLevelScore failed (will retry when online):', err && err.code);
  }
}

// =============================================================================
// saveLeaderboardEntry
// =============================================================================
// Adds a new entry to the leaderboard collection.
// Called only when a player wins a level AND has not opted out of the
// leaderboard (profile.hide_from_leaderboard === false).
export async function saveLeaderboardEntry(uid, email, displayName, level, score) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }

  var { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'leaderboard'), {
      uid:          uid,
      user_email:   email,
      display_name: displayName,
      level:        level,
      score:        score,
      created_at:   serverTimestamp(),
    });
  } catch (err) {
    console.warn('[DB] saveLeaderboardEntry failed (will retry when online):', err && err.code);
  }
}

// =============================================================================
// getLeaderboard
// =============================================================================
// Fetches the top N scores from the leaderboard collection,
// sorted by score descending. Used by the Leaderboard screen.
// Tries Firestore cache first, then network.
export async function getLeaderboard(limitCount) {
  var limit = limitCount !== undefined ? limitCount : 50;
  var db;
  try { db = await getFirestore(); } catch (e) { return []; }

  var m = await import('firebase/firestore');
  var q = m.query(
    m.collection(db, 'leaderboard'),
    m.orderBy('score', 'desc'),
    m.limit(limit)
  );

  // Try Firestore cache (works offline after first successful load)
  try {
    var cacheSnap = await m.getDocsFromCache(q);
    if (!cacheSnap.empty) {
      return cacheSnap.docs.map(function (d) { return { id: d.id, ...d.data() }; });
    }
  } catch (e) { /* cache miss */ }

  // Live network read (with timeout)
  try {
    var netSnap = await withTimeout(m.getDocs(q));
    return netSnap.docs.map(function (d) { return { id: d.id, ...d.data() }; });
  } catch (e) {
    return []; // return empty rather than crash on no internet
  }
}

// =============================================================================
// removeLeaderboardEntriesForUser
// =============================================================================
// Deletes all leaderboard entries for a given UID.
// Called when the user opts out of the leaderboard or deletes their account.
export async function removeLeaderboardEntriesForUser(uid) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }

  var m = await import('firebase/firestore');
  try {
    var q    = m.query(m.collection(db, 'leaderboard'), m.where('uid', '==', uid));
    var snap = await withTimeout(m.getDocs(q));
    await Promise.all(snap.docs.map(function (d) {
      return m.deleteDoc(m.doc(db, 'leaderboard', d.id));
    }));
  } catch (err) {
    console.warn('[DB] removeLeaderboardEntriesForUser failed:', err && err.code);
  }
}

// =============================================================================
// deleteLevelScoresForUser
// =============================================================================
// Deletes all levelScores records for a given UID.
// Called when a user deletes their account via Settings.
export async function deleteLevelScoresForUser(uid) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }

  var m = await import('firebase/firestore');
  try {
    var q    = m.query(m.collection(db, 'levelScores'), m.where('uid', '==', uid));
    var snap = await withTimeout(m.getDocs(q));
    await Promise.all(snap.docs.map(function (d) {
      return m.deleteDoc(m.doc(db, 'levelScores', d.id));
    }));
  } catch (err) {
    console.warn('[DB] deleteLevelScoresForUser failed:', err && err.code);
  }
}
