import React, { createContext, useState, useContext, useEffect } from 'react';
import { enableDemoMode, isDemoMode, disableDemoMode } from '@/lib/demoMode';
import { signInWithGoogle, firebaseSignOut, getCurrentFirebaseUser } from '@/lib/firebaseAuth';

const AuthContext = createContext();

const isNativePlatform = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);           // { email, displayName, uid }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false); // not needed with Firebase
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const firebaseUser = await getCurrentFirebaseUser();
      if (firebaseUser) {
        setUser({ email: firebaseUser.email, displayName: firebaseUser.displayName, uid: firebaseUser.uid });
        setIsAuthenticated(true);
        setAuthError(null);
        disableDemoMode();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      console.error('checkUserAuth failed:', err);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const navigateToLogin = async () => {
    try {
      setIsLoadingAuth(true);
      const result = await signInWithGoogle();
      setUser({ email: result.email, displayName: result.displayName, uid: result.uid });
      setIsAuthenticated(true);
      setAuthError(null);
      disableDemoMode();
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      setAuthError({ type: 'auth_failed', message: err.message || 'Sign-in failed' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: 'Signed out' });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
      isNativeMobile: isNativePlatform(),
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
