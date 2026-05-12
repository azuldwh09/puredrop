import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { signInWithGoogle, firebaseSignOut } from '@/lib/firebaseAuth';

const AuthContext = createContext(null);

const isNativeMobile = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                           = useState(null);
  const [isAuthenticated, setIsAuthenticated]     = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]         = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError]                 = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});
  const [authChecked, setAuthChecked]             = useState(false);
  const [loginError, setLoginError]               = useState(null);
  const loggingIn = useRef(false);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError('unauthenticated');
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setIsLoadingPublicSettings(false);
  }, []);

  useEffect(() => {
    checkUserAuth();
    checkAppState();
  }, []);

  /**
   * Sign in with Google via Firebase.
   * Native: shows native Google account picker — no browser needed.
   * Web: Firebase popup.
   * After getting the Firebase ID token we log into Base44 using loginWithProvider.
   */
  const navigateToLogin = useCallback(async () => {
    if (loggingIn.current) return;
    loggingIn.current = true;
    setLoginError(null);
    setIsLoadingAuth(true);

    try {
      // Step 1 — Get Google ID token from Firebase
      const { idToken, email, displayName } = await signInWithGoogle();

      // Step 2 — Exchange with Base44
      // base44.auth.loginWithProvider redirects on web but on native
      // we call it differently — use loginViaEmailPassword fallback if needed.
      // Try the standard provider flow first:
      try {
        await base44.auth.loginWithProvider('google', idToken);
      } catch (providerErr) {
        console.warn('loginWithProvider failed, trying token exchange:', providerErr);
        // Fallback: set the token directly if Base44 exposes a token in the error
        // or re-throw for user to see
        throw providerErr;
      }

      // Step 3 — Re-check Base44 session
      await checkUserAuth();
    } catch (err) {
      console.error('Sign-in error:', err);
      const msg = err?.message?.includes('cancel')
        ? 'Sign-in cancelled.'
        : 'Sign-in failed. Please try again.';
      setLoginError(msg);
      setIsLoadingAuth(false);
    } finally {
      loggingIn.current = false;
    }
  }, [checkUserAuth]);

  const logout = useCallback(async () => {
    await firebaseSignOut();
    try { base44.auth.logout(); } catch {}
    setUser(null);
    setIsAuthenticated(false);
    setAuthError('unauthenticated');
    setLoginError(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      loginError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      isOffline: false,
      isNativeMobile: isNativeMobile(),
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
