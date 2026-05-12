import React, { createContext, useState, useContext, useEffect } from 'react';
import { signInWithGoogle, firebaseSignOut, onAuthStateChanged } from '@/lib/firebaseAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start true — wait for Firebase to restore session before rendering anything
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribe = null;

    // onAuthStateChanged fires immediately with the persisted user (or null)
    // This is the ONLY reliable way to know auth state — no polling, no retries.
    onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
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

    return () => { if (unsubscribe) unsubscribe(); };
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
