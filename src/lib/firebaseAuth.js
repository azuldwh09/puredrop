/**
 * Firebase core -- auth + Firestore
 * Single source of truth for the Firebase app instance.
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-p9yO7iFUuPah2DsXMgY06kiIpB_oHl0",
  authDomain: "puredrop-730ca.firebaseapp.com",
  projectId: "puredrop-730ca",
  storageBucket: "puredrop-730ca.firebasestorage.app",
  messagingSenderId: "216915385441",
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
  const {
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager,
    getFirestore: _getFirestore,
  } = await import('firebase/firestore');
  try {
    // Use singleTabManager -- multipleTabManager requires SharedWorker which
    // is NOT available in Android WebView / Capacitor environments.
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true }),
      }),
    });
  } catch (e) {
    console.warn('[Firestore] offline persistence unavailable:', e && (e.code || e.message));
    try { _db = _getFirestore(app); } catch (_) { _db = _getFirestore(app); }
  }
  return _db;
}

const isNative = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

export async function signInWithGoogle() {
  const auth = await getFirebaseAuth();

  if (isNative()) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

      const current = await FirebaseAuthentication.getCurrentUser().catch(() => null);
      if (current && current.user) {
        await FirebaseAuthentication.signOut().catch(() => {});
      }

      console.log('[Auth] Starting native Google Sign-In...');
      const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
      console.log('[Auth] Native sign-in result -- has idToken:', !!(result && result.credential && result.credential.idToken));

      const idToken = result && result.credential && result.credential.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In was cancelled or returned no token.');
      }

      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      const credential = GoogleAuthProvider.credential(idToken);
      const jsResult = await signInWithCredential(auth, credential);
      console.log('[Auth] signInWithCredential OK, uid:', jsResult.user && jsResult.user.uid);
      return jsResult.user;
    } catch (err) {
      const code = (err && err.code) || '';
      const msg = (err && err.message) || '';
      let friendly = msg;
      if (code.includes('DEVELOPER_ERROR') || msg.includes('DEVELOPER_ERROR')) {
        friendly = 'Config error: SHA-1 fingerprint missing or google-services.json outdated.';
      } else if (code.includes('sign_in_cancelled') || code.includes('12501')) {
        friendly = 'Sign-in was cancelled.';
      } else if (code.includes('network_error') || code.includes('7')) {
        friendly = 'Network error -- check your internet connection.';
      }
      console.error('[Auth] Native sign-in failed:', code, msg);
      const error = new Error(friendly);
      error.code = code;
      throw error;
    }
  }

  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  const webResult = await signInWithPopup(auth, provider);
  return webResult.user;
}

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

export async function onAuthStateChanged(callback) {
  const auth = await getFirebaseAuth();
  const { onAuthStateChanged: _on } = await import('firebase/auth');
  return _on(auth, callback);
}
