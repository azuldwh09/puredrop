import React, { createContext, useState, useContext, useEffect } from 'react';
import { signInWithGoogle, firebaseSignOut, onAuthStateChanged } from '@/lib/firebaseAuth';
import { disableDemoMode } from '@/lib/demoMode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribe = null;

    const authTimeout = setTimeout(() => {
      console.warn('[Auth] Firebase auth check timed out');
      setIsLoadingAuth(false);
    }, 6000);

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
    }).catch((err) => {
      clearTimeout(authTimeout);
      setIsLoadingAuth(false);
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
    } catch (err) {
      const msg = err && err.code ? (err.code + ': ' + err.message) : ((err && err.message) || 'Sign-in failed');
      console.error('Google Sign-In failed:', msg);
      setAuthError({ type: 'auth_failed', message: msg });
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    await firebaseSignOut();
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
