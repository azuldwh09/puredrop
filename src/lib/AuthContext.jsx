import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { enableDemoMode, isDemoMode, disableDemoMode } from '@/lib/demoMode';
import { nativeLogin, nativeLogout } from '@/lib/nativeAuth';

const AuthContext = createContext();

const isNativePlatform = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // On native, skip the public-settings HTTP fetch (relative URL fails on device)
    // and go straight to auth check.
    if (isNativePlatform()) {
      setIsLoadingPublicSettings(false);
      await checkUserAuth();
      return;
    }

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        const isNetworkError = !appError.status || appError.message === 'Network Error' || !navigator.onLine;
        if (isNetworkError) {
          enableDemoMode();
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          setAuthError({ type: reason, message: appError.message });
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      if (!navigator.onLine || error.message === 'Network Error') {
        enableDemoMode();
      } else {
        setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const navigateToLogin = async () => {
    if (isNativePlatform()) {
      try {
        setIsLoadingAuth(true);
        await nativeLogin();
        await checkUserAuth();
      } catch (err) {
        console.error('Native login failed:', err);
        setIsLoadingAuth(false);
      }
    } else {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (isNativePlatform()) {
      nativeLogout();
      // Re-check auth state so UI updates correctly
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
    } else {
      if (shouldRedirect) {
        base44.auth.logout(window.location.href);
      } else {
        base44.auth.logout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
      authError, appPublicSettings, authChecked, logout, navigateToLogin,
      checkUserAuth, checkAppState,
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
