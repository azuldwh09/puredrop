/**
 * Firestore helpers — replaces base44.entities.*
 * Collections: playerProfiles, levelScores, leaderboard
 */
import { getFirestore } from '@/lib/firebaseAuth';
import { MAX_CUPS } from '@/lib/cupSkins';

// ─── PlayerProfile ───────────────────────────────────────────────────────────

export async function getOrCreateProfile(uid, email, displayName) {
  const db = await getFirestore();
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(db, 'playerProfiles', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: uid, ...snap.data() };

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

export async function updateProfile(uid, updates) {
  const db = await getFirestore();
  const { doc, updateDoc, getDoc } = await import('firebase/firestore');
  const ref = doc(db, 'playerProfiles', uid);
  await updateDoc(ref, updates);
  const snap = await getDoc(ref);
  return { id: uid, ...snap.data() };
}

export async function getProfile(uid) {
  const db = await getFirestore();
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'playerProfiles', uid));
  if (!snap.exists()) return null;
  return { id: uid, ...snap.data() };
}

export async function deleteProfile(uid) {
  const db = await getFirestore();
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'playerProfiles', uid));
}

// ─── LevelScore ──────────────────────────────────────────────────────────────

export async function saveLevelScore(uid, email, level, score, win, stars, accuracy) {
  const db = await getFirestore();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  await addDoc(collection(db, 'levelScores'), {
    uid, user_email: email, level, score, win, stars, accuracy,
    created_at: serverTimestamp(),
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function saveLeaderboardEntry(uid, email, displayName, level, score) {
  const db = await getFirestore();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  await addDoc(collection(db, 'leaderboard'), {
    uid, user_email: email, display_name: displayName, level, score,
    created_at: serverTimestamp(),
  });
}

export async function getLeaderboard(limitCount = 50) {
  const db = await getFirestore();
  const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function removeLeaderboardEntriesForUser(uid) {
  const db = await getFirestore();
  const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  const q = query(collection(db, 'leaderboard'), where('uid', '==', uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'leaderboard', d.id))));
}

export async function deleteLevelScoresForUser(uid) {
  const db = await getFirestore();
  const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
  const q = query(collection(db, 'levelScores'), where('uid', '==', uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'levelScores', d.id))));
}
