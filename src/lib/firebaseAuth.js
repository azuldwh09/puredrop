/**
 * Firebase Authentication for PureDrop
 * Native: @capacitor-firebase/authentication signs in at OS level,
 *         then we mirror that into the Firebase JS SDK so auth.currentUser persists.
 * Web: Firebase SDK popup (unchanged)
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-p9yO7iFUuPah2DsXMgY06kiIpB_oHl0",
  authDomain: "puredrop-730ca.firebaseapp.com",
  projectId: "puredrop-730ca",
  storageBucket: "puredrop-730ca.firebasestorage.app",
  messagingSenderId: "216915385441",
  appId: "1:216915385441:android:c8cd84f347bf1dcb739e20",
  googleWebClientId: "216915385441-dho1057l9f2d3c8rjvi9jqgjgcuk473f.apps.googleusercontent.com",
};

let _auth = null;

async function getFirebaseAuth() {
  if (_auth) return _auth;
  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth, indexedDBLocalPersistence, initializeAuth } = await import('firebase/auth');
  let app;
  if (getApps().length) {
    app = getApps()[0];
    _auth = getAuth(app);
  } else {
    app = initializeApp(FIREBASE_CONFIG);
    // Use indexedDB persistence so the session survives app restarts on native
    _auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
  }
  return _auth;
}

const isNative = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

/**
 * Sign in with Google.
 * On native: triggers the OS Google account picker, then mirrors the
 * credential into the Firebase JS SDK so currentUser is set and persisted.
 */
export async function signInWithGoogle() {
  if (isNative()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

    // Sign out of native layer first to always show account picker
    await FirebaseAuthentication.signOut().catch(() => {});

    const result = await FirebaseAuthentication.signInWithGoogle({
      customParameters: [{ key: 'client_id', value: FIREBASE_CONFIG.googleWebClientId }],
    });

    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error('Google Sign-In cancelled or failed');

    // Mirror into the JS SDK so currentUser is set and persisted
    const auth = await getFirebaseAuth();
    const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
    const credential = GoogleAuthProvider.credential(idToken);
    const jsResult = await signInWithCredential(auth, credential);

    return {
      idToken,
      accessToken: result?.credential?.accessToken,
      email: jsResult.user.email,
      displayName: jsResult.user.displayName,
      uid: jsResult.user.uid,
    };
  }

  // Web fallback
  const auth = await getFirebaseAuth();
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  const webResult = await signInWithPopup(auth, provider);
  const idToken = await webResult.user.getIdToken();
  return {
    idToken,
    email: webResult.user.email,
    displayName: webResult.user.displayName,
    uid: webResult.user.uid,
  };
}

/**
 * Sign out — both native layer and JS SDK.
 */
export async function firebaseSignOut() {
  try {
    if (isNative()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut().catch(() => {});
    }
    // Always sign out of JS SDK so currentUser is cleared
    const auth = await getFirebaseAuth();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase sign out error:', e);
  }
}

/**
 * Get current user from the JS SDK (works on both web and native).
 * Uses onAuthStateChanged to wait for the persisted session to restore.
 */
export async function getCurrentFirebaseUser() {
  try {
    const auth = await getFirebaseAuth();
    // If already resolved, return immediately
    if (auth.currentUser) return auth.currentUser;
    // Otherwise wait for auth state to be determined (handles app restart / cold start)
    return await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  } catch {
    return null;
  }
}
