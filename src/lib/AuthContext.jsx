import React, { createContext, useState, useContext, useEffect } from 'react';
import { signInWithGoogle, firebaseSignOut, onAuthStateChanged } from '@/lib/firebaseAuth';
import { disableDemoMode } from '@/lib/demoMode';
import { diagStep } from '@/components/game/DiagPanel';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribe = null;

    diagStep('auth:1:init', 'run', 'setting up onAuthStateChanged');

    const authTimeout = setTimeout(() => {
      console.warn('[Auth] Firebase auth check timed out');
      diagStep('auth:1:init', 'fail', 'TIMEOUT after 6s -- no Firebase response');
      setIsLoadingAuth(false);
    }, 6000);

    diagStep('auth:2:indexeddb', 'run', 'Firebase restoring session from IndexedDB...');

    onAuthStateChanged((firebaseUser) => {
      clearTimeout(authTimeout);
      if (firebaseUser) {
        diagStep('auth:2:indexeddb', 'ok', 'session restored: ' + firebaseUser.email);
        diagStep('auth:3:user', 'ok', 'uid=' + firebaseUser.uid);
        disableDemoMode();
        setUser({ email: firebaseUser.email, displayName: firebaseUser.displayName, uid: firebaseUser.uid });
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        diagStep('auth:2:indexeddb', 'ok', 'no saved session (user=null)');
        diagStep('auth:3:user', 'skip', 'no user -- sign-in screen will show');
        setUser(null);
        setIsAuthenticated(false);
      }
      diagStep('auth:1:init', 'ok', 'isLoadingAuth -> false');
      setIsLoadingAuth(false);
    }).then((unsub) => {
      unsubscribe = unsub;
    }).catch((err) => {
      clearTimeout(authTimeout);
      diagStep('auth:2:indexeddb', 'fail', (err && err.message) || String(err));
      diagStep('auth:1:init', 'fail', 'onAuthStateChanged setup failed');
      setIsLoadingAuth(false);
    });

    return () => {
      clearTimeout(authTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const navigateToLogin = async () => {
    try {
      diagStep('signin:1:start', 'run', 'signInWithGoogle called');
      setAuthError(null);
      setIsLoadingAuth(true);
      await signInWithGoogle();
      diagStep('signin:1:start', 'ok', 'signInWithGoogle resolved');
    } catch (err) {
      const msg = err && err.code ? (err.code + ': ' + err.message) : ((err && err.message) || 'Sign-in failed');
      diagStep('signin:1:start', 'fail', msg);
      console.error('Google Sign-In failed:', msg);
      setAuthError({ type: 'auth_failed', message: msg });
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    diagStep('logout', 'run', 'signing out...');
    await firebaseSignOut();
    diagStep('logout', 'ok', 'signed out');
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
