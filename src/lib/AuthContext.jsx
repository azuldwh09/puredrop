import React, { createContext, useState, useContext, useEffect } from 'react';
import { signInWithGoogle, firebaseSignOut, onAuthStateChanged } from '@/lib/firebaseAuth';
import { disableDemoMode } from '@/lib/demoMode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start true — wait for Firebase to restore session before rendering anything
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribe = null;

    // Safety net: if Firebase doesn't respond within 6s (e.g. completely offline cold start),
    // stop blocking the UI so the user can still play in local/demo mode.
    const authTimeout = setTimeout(() => {
      console.warn('[Auth] Firebase auth check timed out -- proceeding without session');
      setIsLoadingAuth(false);
    }, 6000);

    // onAuthStateChanged fires immediately with the persisted user (or null) from IndexedDB.
    // Even offline, this resolves quickly if the user has signed in before.
    onAuthStateChanged((firebaseUser) => {
      clearTimeout(authTimeout);
      if (firebaseUser) {
        disableDemoMode();
        setUser({ email: firebaseUser.email, displayName: firebaseUser.displayName, uid: firebaseUser.uid });
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      clearTimeout(authTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const navigateToLogin = async () => {
    try {
      setAuthError(null);
      setIsLoadingAuth(true);
      await signInWithGoogle();
      // onAuthStateChanged above will fire and set the user automatically
    } catch (err) {
      const msg = err?.code ? `${err.code}: ${err.message}` : (err?.message || 'Sign-in failed');
      console.error('Google Sign-In failed:', msg);
      setAuthError({ type: 'auth_failed', message: msg });
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    await firebaseSignOut();
    // onAuthStateChanged will fire and clear user automatically
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      authChecked: !isLoadingAuth,
      logout,
      navigateToLogin,
      checkUserAuth: () => {},
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
