/**
 * Firestore helpers -- replaces base44.entities.*
 * Collections: playerProfiles, levelScores, leaderboard
 *
 * Offline-first: all reads attempt cache first, then network.
 * Writes are queued by Firestore internally and synced when reconnected.
 */
import { getFirestore } from '@/lib/firebaseAuth';
import { MAX_CUPS } from '@/lib/cupSkins';

// How long (ms) to wait for a Firestore network response before falling back to cache
const FIRESTORE_TIMEOUT_MS = 4000;

/**
 * Wraps a Firestore promise with a timeout.
 * If it times out, rejects with an error tagged offline=true.
 */
function withTimeout(promise, ms = FIRESTORE_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(() => {
        const e = new Error(`Firestore timed out after ${ms}ms (offline?)`);
        e.offline = true;
        reject(e);
      }, ms);
      // Make sure the timer doesn't keep Node alive in tests
      if (t?.unref) t.unref();
    }),
  ]);
}

// -- PlayerProfile -----------------------------------------------------------

export async function getOrCreateProfile(uid, email, displayName) {
  const db = await getFirestore();
  const { doc, getDoc, getDocFromCache, setDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(db, 'playerProfiles', uid);

  // 1. Try cache first (instant, works offline)
  let snap = null;
  try {
    snap = await getDocFromCache(ref);
    if (snap.exists()) return { id: uid, ...snap.data() };
  } catch {
    // No cached version yet -- fall through to network
  }

  // 2. Try network with a timeout
  try {
    snap = await withTimeout(getDoc(ref));
    if (snap.exists()) return { id: uid, ...snap.data() };
  } catch (err) {
    if (err.offline) {
      // Offline and no cache -- return a local-only profile so the game can start
      console.warn('[Firestore] Offline: returning local profile for', uid);
      return buildLocalProfile(uid, email, displayName);
    }
    throw err;
  }

  // 3. Profile doesn't exist yet -- create it (Firestore queues write if offline)
  const profile = {
    uid,
    user_email: email,
    display_name: displayName || email.split('@')[0],
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
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}

function buildLocalProfile(uid, email, displayName) {
  // Read from localStorage if we previously cached it there
  try {
    const raw = localStorage.getItem('puredrop_profile');
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.uid === uid) return cached;
    }
  } catch {}
  return {
    id: uid,
    uid,
    user_email: email,
    display_name: displayName || email.split('@')[0],
    cups: MAX_CUPS,
    last_refill_time: new Date().toISOString(),
    selected_cup_skin: 'classic',
    highest_level: 1,
    total_score: 0,
    streak: 0,
    last_play_date: new Date().toDateString(),
    difficulty_tier: 1,
    hide_from_leaderboard: false,
    _local: true, // flag so we can sync later
  };
}

export async function updateProfile(uid, updates) {
  // Always update localStorage cache immediately (works offline)
  try {
    const raw = localStorage.getItem('puredrop_profile');
    const cached = raw ? JSON.parse(raw) : { uid };
    const merged = { ...cached, ...updates };
    localStorage.setItem('puredrop_profile', JSON.stringify(merged));
  } catch {}

  const db = await getFirestore();
  const { doc, updateDoc, getDoc, getDocFromCache } = await import('firebase/firestore');
  const ref = doc(db, 'playerProfiles', uid);

  // Fire the Firestore write (queued if offline, auto-synced when reconnected)
  try {
    await updateDoc(ref, updates);
  } catch (err) {
    // If offline, Firestore queues the write -- that's fine, return the merged local state
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Failed to get document because the client is offline')) {
      const raw = localStorage.getItem('puredrop_profile');
      return raw ? JSON.parse(raw) : { id: uid, uid, ...updates };
    }
    throw err;
  }

  // Try to read back from cache for instant return; fall back to network
  try {
    const snap = await getDocFromCache(ref);
    if (snap.exists()) return { id: uid, ...snap.data() };
  } catch {}
  try {
    const snap = await withTimeout(getDoc(ref));
    return { id: uid, ...snap.data() };
  } catch {
    const raw = localStorage.getItem('puredrop_profile');
    return raw ? JSON.parse(raw) : { id: uid, uid, ...updates };
  }
}

export async function getProfile(uid) {
  const db = await getFirestore();
  const { doc, getDocFromCache, getDoc } = await import('firebase/firestore');
  const ref = doc(db, 'playerProfiles', uid);
  try {
    const snap = await getDocFromCache(ref);
    if (snap.exists()) return { id: uid, ...snap.data() };
  } catch {}
  try {
    const snap = await withTimeout(getDoc(ref));
    if (!snap.exists()) return null;
    return { id: uid, ...snap.data() };
  } catch {
    return null;
  }
}

export async function deleteProfile(uid) {
  const db = await getFirestore();
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'playerProfiles', uid));
}

// -- LevelScore --------------------------------------------------------------

export async function saveLevelScore(uid, email, level, score, win, stars, accuracy) {
  const db = await getFirestore();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'levelScores'), {
      uid, user_email: email, level, score, win, stars, accuracy,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    // Offline -- queued by Firestore automatically
    console.warn('[Firestore] saveLevelScore offline, will sync later', err?.code);
  }
}

// -- Leaderboard -------------------------------------------------------------

export async function saveLeaderboardEntry(uid, email, displayName, level, score) {
  const db = await getFirestore();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'leaderboard'), {
      uid, user_email: email, display_name: displayName, level, score,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] saveLeaderboardEntry offline, will sync later', err?.code);
  }
}

export async function getLeaderboard(limitCount = 50) {
  const db = await getFirestore();
  const { collection, query, orderBy, limit, getDocs, getDocsFromCache } = await import('firebase/firestore');
  const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(limitCount));

  // Try cache first
  try {
    const snap = await getDocsFromCache(q);
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  // Network with timeout
  try {
    const snap = await withTimeout(getDocs(q));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function removeLeaderboardEntriesForUser(uid) {
  const db = await getFirestore();
  const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  try {
    const q = query(collection(db, 'leaderboard'), where('uid', '==', uid));
    const snap = await withTimeout(getDocs(q));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'leaderboard', d.id))));
  } catch (err) {
    console.warn('[Firestore] removeLeaderboardEntriesForUser failed', err?.code);
  }
}

export async function deleteLevelScoresForUser(uid) {
  const db = await getFirestore();
  const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  try {
    const q = query(collection(db, 'levelScores'), where('uid', '==', uid));
    const snap = await withTimeout(getDocs(q));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'levelScores', d.id))));
  } catch (err) {
    console.warn('[Firestore] deleteLevelScoresForUser failed', err?.code);
  }
}
