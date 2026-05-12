/**
 * Firestore helpers -- replaces base44.entities.*
 * Collections: playerProfiles, levelScores, leaderboard
 *
 * Offline-first: all reads attempt Firestore cache first, then network with timeout.
 * Writes are queued by Firestore internally and auto-synced when reconnected.
 */
import { getFirestore } from '@/lib/firebaseAuth';
import { MAX_CUPS } from '@/lib/cupSkins';

// How long (ms) to wait for a Firestore network response before falling back to local
const FIRESTORE_TIMEOUT_MS = 2500;

function withTimeout(promise, ms) {
  var timeout = ms !== undefined ? ms : FIRESTORE_TIMEOUT_MS;
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      var t = setTimeout(function() {
        var e = new Error('Firestore timed out after ' + timeout + 'ms (offline?)');
        e.offline = true;
        reject(e);
      }, timeout);
      if (t && t.unref) t.unref();
    }),
  ]);
}

// -- PlayerProfile -----------------------------------------------------------

export async function getOrCreateProfile(uid, email, displayName) {
  var db;
  try {
    db = await getFirestore();
  } catch (dbErr) {
    // Firestore failed to initialize (e.g. no IndexedDB support) -- go straight to local
    console.warn('[Firestore] init failed, using local profile:', dbErr && dbErr.message);
    return buildLocalProfile(uid, email, displayName);
  }

  var firestoreModule;
  try {
    firestoreModule = await import('firebase/firestore');
  } catch (modErr) {
    console.warn('[Firestore] module import failed:', modErr && modErr.message);
    return buildLocalProfile(uid, email, displayName);
  }

  var doc = firestoreModule.doc;
  var getDoc = firestoreModule.getDoc;
  var getDocFromCache = firestoreModule.getDocFromCache;
  var setDoc = firestoreModule.setDoc;
  var serverTimestamp = firestoreModule.serverTimestamp;
  var ref = doc(db, 'playerProfiles', uid);

  // 1. Try Firestore cache first (instant, always works offline after first successful load)
  try {
    var cacheSnap = await getDocFromCache(ref);
    if (cacheSnap.exists()) {
      return { id: uid, ...cacheSnap.data() };
    }
  } catch (cacheErr) {
    // Cache miss or not initialized -- fall through
  }

  // 2. Try network with a short timeout
  try {
    var netSnap = await withTimeout(getDoc(ref));
    if (netSnap.exists()) {
      return { id: uid, ...netSnap.data() };
    }
  } catch (netErr) {
    if (netErr.offline) {
      // Offline and no Firestore cache -- use localStorage if we have it
      console.warn('[Firestore] Offline: returning local profile for', uid);
      return buildLocalProfile(uid, email, displayName);
    }
    throw netErr;
  }

  // 3. First time: profile does not exist -- create it
  // Firestore will queue the write if offline and sync when reconnected
  var newProfile = {
    uid: uid,
    user_email: email,
    display_name: displayName || (email ? email.split('@')[0] : 'Player'),
    cups: MAX_CUPS,
    last_refill_time: new Date().toISOString(),
    selected_cup_skin: 'classic',
    highest_level: 1,
    total_score: 0,
    streak: 1,
    last_play_date: new Date().toDateString(),
    difficulty_tier: 1,
    hide_from_leaderboard: false,
    created_at: serverTimestamp(),
  };
  try {
    await setDoc(ref, newProfile);
  } catch (writeErr) {
    // Offline write -- Firestore queues it. Return local profile so game starts.
    if (writeErr && (writeErr.code === 'unavailable' || (writeErr.message && writeErr.message.includes('offline')))) {
      var local = { id: uid, ...newProfile, _local: true };
      setCachedProfileDirect(local);
      return local;
    }
    throw writeErr;
  }
  return { id: uid, ...newProfile };
}

function buildLocalProfile(uid, email, displayName) {
  // Check localStorage first (written by setCachedProfile in usePlayerProfile)
  try {
    var raw = localStorage.getItem('puredrop_profile');
    if (raw) {
      var cached = JSON.parse(raw);
      // Only use it if it matches this user (uid check)
      if (!cached.uid || cached.uid === uid) {
        return { ...cached, uid: uid, id: uid, _local: true };
      }
    }
  } catch (e) {}

  return {
    id: uid,
    uid: uid,
    user_email: email,
    display_name: displayName || (email ? email.split('@')[0] : 'Player'),
    cups: MAX_CUPS,
    last_refill_time: new Date().toISOString(),
    selected_cup_skin: 'classic',
    highest_level: 1,
    total_score: 0,
    streak: 0,
    last_play_date: new Date().toDateString(),
    difficulty_tier: 1,
    hide_from_leaderboard: false,
    _local: true,
  };
}

function setCachedProfileDirect(p) {
  try { localStorage.setItem('puredrop_profile', JSON.stringify(p)); } catch (e) {}
}

export async function updateProfile(uid, updates) {
  // Always persist to localStorage immediately (synchronous, works offline)
  try {
    var raw = localStorage.getItem('puredrop_profile');
    var cached = raw ? JSON.parse(raw) : { uid: uid };
    var merged = Object.assign({}, cached, updates);
    // Enforce cup cap on every write
    if (typeof merged.cups === 'number' && merged.cups > MAX_CUPS) {
      merged.cups = MAX_CUPS;
      updates = Object.assign({}, updates, { cups: MAX_CUPS });
    }
    localStorage.setItem('puredrop_profile', JSON.stringify(merged));
  } catch (e) {}

  var db;
  try { db = await getFirestore(); }
  catch (e) {
    var local = localStorage.getItem('puredrop_profile');
    return local ? JSON.parse(local) : { id: uid, uid: uid, ...updates };
  }

  var firestoreModule = await import('firebase/firestore');
  var doc = firestoreModule.doc;
  var updateDoc = firestoreModule.updateDoc;
  var getDoc = firestoreModule.getDoc;
  var getDocFromCache = firestoreModule.getDocFromCache;
  var ref = doc(db, 'playerProfiles', uid);

  // Fire the write (auto-queued offline by Firestore)
  try {
    await updateDoc(ref, updates);
  } catch (writeErr) {
    var code = writeErr && writeErr.code;
    var msg = writeErr && writeErr.message;
    if (code === 'unavailable' || (msg && (msg.includes('offline') || msg.includes('client is offline')))) {
      // Offline -- return the locally merged state
      var localRaw = localStorage.getItem('puredrop_profile');
      return localRaw ? JSON.parse(localRaw) : { id: uid, uid: uid, ...updates };
    }
    throw writeErr;
  }

  // Read back for fresh state: try cache first, then network
  try {
    var cacheSnap = await getDocFromCache(ref);
    if (cacheSnap.exists()) return { id: uid, ...cacheSnap.data() };
  } catch (e) {}
  try {
    var netSnap = await withTimeout(getDoc(ref));
    return { id: uid, ...netSnap.data() };
  } catch (e) {
    var fallbackRaw = localStorage.getItem('puredrop_profile');
    return fallbackRaw ? JSON.parse(fallbackRaw) : { id: uid, uid: uid, ...updates };
  }
}

export async function getProfile(uid) {
  var db;
  try { db = await getFirestore(); } catch (e) { return null; }
  var { doc, getDocFromCache, getDoc } = await import('firebase/firestore');
  var ref = doc(db, 'playerProfiles', uid);
  try {
    var cacheSnap = await getDocFromCache(ref);
    if (cacheSnap.exists()) return { id: uid, ...cacheSnap.data() };
  } catch (e) {}
  try {
    var netSnap = await withTimeout(getDoc(ref));
    if (!netSnap.exists()) return null;
    return { id: uid, ...netSnap.data() };
  } catch (e) {
    return null;
  }
}

export async function deleteProfile(uid) {
  var db = await getFirestore();
  var { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'playerProfiles', uid));
}

// -- LevelScore --------------------------------------------------------------

export async function saveLevelScore(uid, email, level, score, win, stars, accuracy) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }
  var { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'levelScores'), {
      uid: uid, user_email: email, level: level, score: score,
      win: win, stars: stars, accuracy: accuracy,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] saveLevelScore offline, will sync later:', err && err.code);
  }
}

// -- Leaderboard -------------------------------------------------------------

export async function saveLeaderboardEntry(uid, email, displayName, level, score) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }
  var { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'leaderboard'), {
      uid: uid, user_email: email, display_name: displayName,
      level: level, score: score,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] saveLeaderboardEntry offline, will sync later:', err && err.code);
  }
}

export async function getLeaderboard(limitCount) {
  var limit = limitCount !== undefined ? limitCount : 50;
  var db;
  try { db = await getFirestore(); } catch (e) { return []; }
  var { collection, query, orderBy, limit: _limit, getDocs, getDocsFromCache } = await import('firebase/firestore');
  var q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), _limit(limit));

  try {
    var cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) return cacheSnap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
  } catch (e) {}

  try {
    var netSnap = await withTimeout(getDocs(q));
    return netSnap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
  } catch (e) {
    return [];
  }
}

export async function removeLeaderboardEntriesForUser(uid) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }
  var { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  try {
    var q = query(collection(db, 'leaderboard'), where('uid', '==', uid));
    var snap = await withTimeout(getDocs(q));
    await Promise.all(snap.docs.map(function(d) { return deleteDoc(doc(db, 'leaderboard', d.id)); }));
  } catch (err) {
    console.warn('[Firestore] removeLeaderboardEntriesForUser failed:', err && err.code);
  }
}

export async function deleteLevelScoresForUser(uid) {
  var db;
  try { db = await getFirestore(); } catch (e) { return; }
  var { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  try {
    var q = query(collection(db, 'levelScores'), where('uid', '==', uid));
    var snap = await withTimeout(getDocs(q));
    await Promise.all(snap.docs.map(function(d) { return deleteDoc(doc(db, 'levelScores', d.id)); }));
  } catch (err) {
    console.warn('[Firestore] deleteLevelScoresForUser failed:', err && err.code);
  }
}
