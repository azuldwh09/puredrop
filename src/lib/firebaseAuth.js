// =============================================================================
// FIREBASE AUTH + FIRESTORE INITIALIZATION -- src/lib/firebaseAuth.js
// =============================================================================
// Single source of truth for the Firebase app instance.
//
// Why lazy imports everywhere?
//   Firebase modules are large. We import them on first use rather than at
//   module load time so the app renders immediately while Firebase loads in
//   the background. This is especially important on low-end Android devices.
//
// Singleton pattern:
//   _app, _auth, and _db are module-level variables. Once initialized they
//   are reused on every subsequent call, so Firebase is never initialized twice.
//
// Android/Capacitor notes:
//   - Auth uses indexedDBLocalPersistence so the session survives app restarts.
//   - Firestore uses persistentSingleTabManager (not multipleTabManager) because
//     SharedWorker is NOT available inside an Android WebView / Capacitor context.
//   - Google Sign-In on device uses the @capacitor-firebase/authentication plugin
//     with useCredentialManager: false to force the classic account-picker sheet.
// =============================================================================

// -- Firebase project configuration -------------------------------------------
// These values come from the Firebase Console -> Project Settings -> Web app.
// NOTE: Keep appId OUT of this config. Including the Android appId here causes
// the Firebase JS SDK to reject web-based auth inside the Capacitor WebView.
export const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD-p9yO7iFUuPah2DsXMgY06kiIpB_oHl0',
  authDomain:        'puredrop-730ca.firebaseapp.com',
  projectId:         'puredrop-730ca',
  storageBucket:     'puredrop-730ca.firebasestorage.app',
  messagingSenderId: '216915385441',
  appId:             '1:216915385441:android:c8cd84f347bf1dcb739e20',
  // Web OAuth client ID -- used by the Capacitor plugin as a serverClientId
  googleWebClientId: '216915385441-dho1057l9f2d3c8rjvi9jqgjgcuk473f.apps.googleusercontent.com',
};

// -- Module-level singletons (never re-initialized) ----------------------------
let _app  = null;  // Firebase App instance
let _auth = null;  // Firebase Auth instance
let _db   = null;  // Firestore instance

// =============================================================================
// Firebase App
// =============================================================================
// Initializes the Firebase app once. If Firebase has already been initialized
// (e.g. hot reload or duplicate import), reuses the existing app.
export async function getFirebaseApp() {
  if (_app) return _app;
  const { initializeApp, getApps } = await import('firebase/app');
  _app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return _app;
}

// =============================================================================
// Firebase Auth
// =============================================================================
// Initializes auth with IndexedDB persistence so the session is remembered
// across app restarts (works offline -- Firebase reads from local storage).
export async function getFirebaseAuth() {
  if (_auth) return _auth;
  const app = await getFirebaseApp();
  const { getAuth, indexedDBLocalPersistence, initializeAuth } = await import('firebase/auth');
  try {
    // initializeAuth lets us specify the persistence layer explicitly
    _auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  } catch {
    // Falls back to getAuth() if initializeAuth has already been called
    // (e.g. in a hot-reload scenario)
    _auth = getAuth(app);
  }
  return _auth;
}

// =============================================================================
// Firestore
// =============================================================================
// Enables offline persistence with persistentSingleTabManager.
// This means Firestore caches documents locally in IndexedDB and serves them
// instantly even when the device has no internet connection.
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
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        // singleTabManager works in Capacitor WebView (no SharedWorker needed)
        tabManager: persistentSingleTabManager({ forceOwnership: true }),
      }),
    });
  } catch (e) {
    // Offline persistence may be unavailable (e.g. private browsing, iOS quirks)
    // Fall back to in-memory Firestore -- data won't persist across restarts
    console.warn('[Firestore] Offline persistence unavailable:', e && (e.code || e.message));
    try { _db = _getFirestore(app); } catch (_) { _db = _getFirestore(app); }
  }
  return _db;
}

// =============================================================================
// Platform detection
// =============================================================================
// Returns true when running inside a Capacitor native shell (Android or iOS).
// Returns false in a web browser or during Vite dev server.
const isNative = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

// =============================================================================
// Google Sign-In
// =============================================================================
// Handles two very different sign-in paths:
//
//   NATIVE (Android/iOS):
//     Uses @capacitor-firebase/authentication plugin to show the OS-level
//     Google account picker. Returns an idToken which we then exchange for
//     a Firebase credential via signInWithCredential. This avoids the browser
//     redirect/popup which does not work in a native WebView.
//
//   WEB (browser / Vite dev):
//     Uses the standard Firebase signInWithPopup flow.
//
// Both paths fire onAuthStateChanged on success, which updates AuthContext.
export async function signInWithGoogle() {
  const auth = await getFirebaseAuth();

  // -- Native path -----------------------------------------------------------
  if (isNative()) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

      // Sign out any stale native session before starting a fresh sign-in.
      // Without this, some devices return a cached token from a previous user.
      const current = await FirebaseAuthentication.getCurrentUser().catch(() => null);
      if (current && current.user) {
        await FirebaseAuthentication.signOut().catch(() => {});
      }

      console.log('[Auth] Starting native Google Sign-In...');

      // useCredentialManager: false forces the classic account-picker sheet
      // instead of the newer Credential Manager API, which has compatibility
      // issues on some Android versions.
      const result = await FirebaseAuthentication.signInWithGoogle({
        useCredentialManager: false,
      });

      console.log('[Auth] Native sign-in result -- has idToken:',
        !!(result && result.credential && result.credential.idToken));

      const idToken = result && result.credential && result.credential.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In was cancelled or returned no token.');
      }

      // Exchange the native idToken for a Firebase JS SDK credential
      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      const credential = GoogleAuthProvider.credential(idToken);
      const jsResult = await signInWithCredential(auth, credential);
      console.log('[Auth] signInWithCredential OK, uid:', jsResult.user && jsResult.user.uid);
      return jsResult.user;

    } catch (err) {
      // Map cryptic Firebase/Google error codes to human-readable messages
      const code = (err && err.code) || '';
      const msg  = (err && err.message) || '';
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

  // -- Web path --------------------------------------------------------------
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  const webResult = await signInWithPopup(auth, provider);
  return webResult.user;
}

// =============================================================================
// Sign-Out
// =============================================================================
// Signs out from Firebase and, on native builds, from the Capacitor plugin too.
// After this, onAuthStateChanged fires with null and AuthContext clears the user.
export async function firebaseSignOut() {
  try {
    // Sign out from the native layer first (clears the OS account session)
    if (isNative()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut().catch(() => {});
    }
    // Sign out from Firebase JS SDK (clears IndexedDB session token)
    const auth = await getFirebaseAuth();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  } catch (e) {
    console.warn('[Auth] firebaseSignOut error:', e);
  }
}

// =============================================================================
// Get current user (one-time read)
// =============================================================================
// Returns the currently signed-in Firebase user, or null if not signed in.
// Used in components that need the user on demand (e.g. SettingsModal) rather
// than subscribing to ongoing auth state changes.
export async function getCurrentFirebaseUser() {
  try {
    const auth = await getFirebaseAuth();
    // If auth is already initialized and has a user, return immediately
    if (auth.currentUser) return auth.currentUser;
    // Otherwise wait for the next auth state event (handles cold start race)
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

// =============================================================================
// Auth state change subscription
// =============================================================================
// Wraps Firebase's onAuthStateChanged so callers don't need to import Firebase
// directly. Returns a Promise<unsubscribe function>.
// Used exclusively by AuthContext -- everything else should use useAuth().
export async function onAuthStateChanged(callback) {
  const auth = await getFirebaseAuth();
  const { onAuthStateChanged: _on } = await import('firebase/auth');
  return _on(auth, callback);
}
