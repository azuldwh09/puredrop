/**
 * Firebase Authentication for PureDrop
 * Native: @capacitor-firebase/authentication (native Google Sign-In sheet — no browser)
 * Web: Firebase SDK popup
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-p9yO7iFUuPah2DsXMgY06kiIpB_oHl0",
  authDomain: "puredrop-730ca.firebaseapp.com",
  projectId: "puredrop-730ca",
  storageBucket: "puredrop-730ca.firebasestorage.app",
  messagingSenderId: "216915385441",
  appId: "1:216915385441:android:c8cd84f347bf1dcb739e20",
  // Web client ID from google-services.json oauth_client
  googleWebClientId: "216915385441-dho1057l9f2d3c8rjvi9jqgjgcuk473f.apps.googleusercontent.com",
};

let _auth = null;

async function getFirebaseAuth() {
  if (_auth) return _auth;
  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  _auth = getAuth(app);
  return _auth;
}

const isNative = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

/**
 * Sign in with Google.
 * Returns { idToken, email, displayName, uid }
 */
export async function signInWithGoogle() {
  if (isNative()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

    // Sign out first to force account picker every time
    await FirebaseAuthentication.signOut().catch(() => {});

    const result = await FirebaseAuthentication.signInWithGoogle({
      // Pass the web client ID so Firebase can mint an ID token
      customParameters: [{ key: 'client_id', value: FIREBASE_CONFIG.googleWebClientId }],
    });

    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error('Google Sign-In cancelled or failed');

    return {
      idToken,
      accessToken: result?.credential?.accessToken,
      email: result.user?.email,
      displayName: result.user?.displayName,
      uid: result.user?.uid,
    };
  }

  // Web fallback — Firebase popup
  const auth = await getFirebaseAuth();
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email,
    displayName: result.user.displayName,
    uid: result.user.uid,
  };
}

/**
 * Sign out from Firebase
 */
export async function firebaseSignOut() {
  try {
    if (isNative()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } else {
      const auth = await getFirebaseAuth();
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    }
  } catch (e) {
    console.warn('Firebase sign out error:', e);
  }
}

/**
 * Get the current Firebase user
 */
export async function getCurrentFirebaseUser() {
  try {
    if (isNative()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.getCurrentUser();
      return result?.user || null;
    }
    const auth = await getFirebaseAuth();
    return auth.currentUser;
  } catch {
    return null;
  }
}
