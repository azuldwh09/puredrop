/**
 * Firebase core — auth + Firestore
 * Single source of truth for the Firebase app instance.
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-p9yO7iFUuPah2DsXMgY06kiIpB_oHl0",
  authDomain: "puredrop-730ca.firebaseapp.com",
  projectId: "puredrop-730ca",
  storageBucket: "puredrop-730ca.firebasestorage.app",
  messagingSenderId: "216915385441",
  appId: "1:216915385441:android:c8cd84f347bf1dcb739e20",
  googleWebClientId: "216915385441-dho1057l9f2d3c8rjvi9jqgjgcuk473f.apps.googleusercontent.com",
};

let _app = null;
let _auth = null;
let _db = null;

export async function getFirebaseApp() {
  if (_app) return _app;
  const { initializeApp, getApps } = await import('firebase/app');
  _app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return _app;
}

export async function getFirebaseAuth() {
  if (_auth) return _auth;
  const app = await getFirebaseApp();
  const { getAuth, indexedDBLocalPersistence, initializeAuth } = await import('firebase/auth');
  try {
    _auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  } catch {
    _auth = getAuth(app);
  }
  return _auth;
}

export async function getFirestore() {
  if (_db) return _db;
  const app = await getFirebaseApp();
  const { getFirestore: _getFirestore } = await import('firebase/firestore');
  _db = _getFirestore(app);
  return _db;
}

const isNative = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

/**
 * Sign in with Google.
 * Native: uses @capacitor-firebase/authentication (OS account picker),
 *         then mirrors into JS SDK so currentUser is persisted.
 * Web: Firebase popup.
 */
export async function signInWithGoogle() {
  const auth = await getFirebaseAuth();

  if (isNative()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signOut().catch(() => {});

    const result = await FirebaseAuthentication.signInWithGoogle({
      customParameters: [{ key: 'client_id', value: FIREBASE_CONFIG.googleWebClientId }],
    });

    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error('Google Sign-In cancelled or no idToken returned');

    const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
    const credential = GoogleAuthProvider.credential(idToken);
    const jsResult = await signInWithCredential(auth, credential);
    return jsResult.user;
  }

  // Web
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  const webResult = await signInWithPopup(auth, provider);
  return webResult.user;
}

/**
 * Sign out from both native layer and JS SDK.
 */
export async function firebaseSignOut() {
  try {
    if (isNative()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut().catch(() => {});
    }
    const auth = await getFirebaseAuth();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  } catch (e) {
    console.warn('firebaseSignOut error:', e);
  }
}

/**
 * Returns a Promise that resolves to the current Firebase user (or null).
 * Waits for auth state to be restored from persistence on cold start.
 */
export async function getCurrentFirebaseUser() {
  try {
    const auth = await getFirebaseAuth();
    if (auth.currentUser) return auth.currentUser;
    return new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged((user) => {
        unsub();
        resolve(user);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export async function onAuthStateChanged(callback) {
  const auth = await getFirebaseAuth();
  const { onAuthStateChanged: _on } = await import('firebase/auth');
  return _on(auth, callback);
}
