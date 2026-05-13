// =============================================================================
// AUTH CONTEXT -- src/lib/AuthContext.jsx
// =============================================================================
// Central authentication state for the entire app.
//
// What it does:
//   - Wraps the app in <AuthProvider> which listens to Firebase's
//     onAuthStateChanged. This fires almost instantly even offline because
//     Firebase restores the last session from IndexedDB.
//   - Exposes user, isAuthenticated, isLoadingAuth, and authError to any
//     component via the useAuth() hook.
//   - Provides navigateToLogin() which kicks off the Google Sign-In flow
//     (native Capacitor plugin on Android/iOS, web popup in browser).
//   - Provides logout() which signs out from both Firebase and the native
//     Capacitor auth plugin.
//
// IMPORTANT:
//   - isLoadingAuth starts as TRUE and becomes FALSE once Firebase resolves
//     the session (or times out after 6 seconds). Nothing in the app should
//     attempt to load user data until isLoadingAuth === false.
//   - The 6-second timeout is a safety net for cold offline starts where
//     IndexedDB is extremely slow. After the timeout, the app shows the
//     sign-in screen rather than spinning forever.
// =============================================================================

import React, { createContext, useState, useContext, useEffect } from 'react';
import { signInWithGoogle, firebaseSignOut, onAuthStateChanged } from '@/lib/firebaseAuth';
import { disableDemoMode } from '@/lib/demoMode';

const AuthContext = createContext();

// -- Provider -----------------------------------------------------------------
export const AuthProvider = ({ children }) => {
  // The resolved Firebase user object, or null if not signed in
  const [user, setUser] = useState(null);
  // Convenience boolean derived from user
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // TRUE until Firebase has confirmed the session (or timed out)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Stores sign-in error details so the UI can show a user-friendly message
  const [authError, setAuthError] = useState(null);

  // -- Session restore on mount ----------------------------------------------
  // Firebase reads from IndexedDB and fires the callback in ~50-200ms.
  // On a completely offline first launch it may never fire, so we
  // enforce a 6-second ceiling before giving up and showing sign-in.
  useEffect(() => {
    let unsubscribe = null;

    const authTimeout = setTimeout(() => {
      console.warn('[Auth] Firebase auth check timed out after 6s');
      setIsLoadingAuth(false);
    }, 6000);

    onAuthStateChanged((firebaseUser) => {
      clearTimeout(authTimeout);

      if (firebaseUser) {
        // User is signed in -- populate state and exit demo mode if active
        disableDemoMode();
        setUser({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          uid: firebaseUser.uid,
        });
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        // No session found -- user will see the sign-in screen
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoadingAuth(false);
    })
      .then((unsub) => { unsubscribe = unsub; })
      .catch((err) => {
        // onAuthStateChanged itself failed (rare -- e.g. Firebase SDK not loaded)
        console.error('[Auth] onAuthStateChanged setup failed:', err && err.message);
        clearTimeout(authTimeout);
        setIsLoadingAuth(false);
      });

    // Unsubscribe the Firebase listener when the provider unmounts
    return () => {
      clearTimeout(authTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // -- Sign-in action --------------------------------------------------------
  // Called when the user taps "Sign in with Google" on the sign-in screen.
  // On Android/iOS: triggers the native Capacitor Google Sign-In sheet.
  // On web: opens a Google OAuth popup.
  // After success, onAuthStateChanged fires automatically and updates state.
  const navigateToLogin = async () => {
    try {
      setAuthError(null);
      setIsLoadingAuth(true);
      await signInWithGoogle();
      // onAuthStateChanged will fire and update user state automatically
    } catch (err) {
      const msg = err && err.code
        ? (err.code + ': ' + err.message)
        : ((err && err.message) || 'Sign-in failed');
      console.error('[Auth] Google Sign-In failed:', msg);
      setAuthError({ type: 'auth_failed', message: msg });
      setIsLoadingAuth(false);
    }
  };

  // -- Sign-out action -------------------------------------------------------
  // Signs out from Firebase AND the native Capacitor plugin (if on device).
  // onAuthStateChanged fires after, which sets user=null automatically.
  const logout = async () => {
    await firebaseSignOut();
  };

  // -- Context value ---------------------------------------------------------
  // We expose some legacy-named fields (isLoadingPublicSettings, authChecked, etc.)
  // so that any old components that still reference them don't crash.
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,    // legacy compat -- always false
      authError,
      appPublicSettings: null,           // legacy compat -- not used
      authChecked: !isLoadingAuth,       // legacy compat -- inverse of isLoadingAuth
      logout,
      navigateToLogin,
      checkUserAuth: () => {},           // legacy compat -- no-op
      checkAppState: () => {},           // legacy compat -- no-op
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// -- Hook ----------------------------------------------------------------------
// Use this in any component to access auth state:
//   const { user, isAuthenticated, isLoadingAuth, navigateToLogin, logout } = useAuth();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
