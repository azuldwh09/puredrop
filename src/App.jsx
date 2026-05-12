import React from 'react';
import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { enableDemoMode, isDemoMode, disableDemoMode } from '@/lib/demoMode';
import Game from './pages/Game';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LeaderboardPage from './pages/LeaderboardPage';

const isNativePlatform = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

const SignInScreen = ({ onSignIn, onDemo, isLoading }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background px-8">
    <div className="flex flex-col items-center gap-2 mb-4">
      <span className="text-5xl">💧</span>
      <h1 className="font-pixel text-2xl text-foreground tracking-widest">PureDrop</h1>
      <p className="text-sm text-muted-foreground text-center">Catch drops. Beat levels. Climb the leaderboard.</p>
    </div>
    {isLoading ? (
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    ) : (
      <>
        <button
          onClick={onSignIn}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-6 rounded-xl shadow-md border border-gray-200 active:opacity-80 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.6 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.1-6.2z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-8.1 6.2C6.6 42.6 14.6 48 24 48z"/></svg>
          Sign in with Google
        </button>
        <button
          onClick={onDemo}
          className="text-sm text-muted-foreground underline underline-offset-4 active:opacity-60"
        >
          Play without signing in
        </button>
      </>
    )}
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();
  const [demoActive, setDemoActive] = React.useState(isDemoMode());

  // Exit demo mode if user successfully signs in
  React.useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && demoActive) {
      disableDemoMode();
      setDemoActive(false);
    }
  }, [isAuthenticated, isLoadingAuth, demoActive]);

  // Load AdSense when user is on real content
  React.useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && (isAuthenticated || demoActive)) {
      if (!document.getElementById('adsense-script')) {
        const script = document.createElement('script');
        script.id = 'adsense-script';
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2912984715921362';
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
        if (!window.adBreak) {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adBreak = window.adConfig = function(o) { window.adsbygoogle.push(o); };
          window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
        }
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, isAuthenticated, demoActive]);

  const handleDemo = () => {
    enableDemoMode();
    setDemoActive(true);
  };

  const handleSignIn = async () => {
    await navigateToLogin();
  };

  // Loading
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // User not registered
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Not authenticated and not in demo — show sign-in screen
  // On native: always show sign-in screen (never auto-enable demo)
  // On web: keep original behaviour (auto-enable demo for AdSense policy)
  if (!isAuthenticated && !demoActive) {
    if (isNativePlatform()) {
      return <SignInScreen onSignIn={handleSignIn} onDemo={handleDemo} isLoading={isLoadingAuth} />;
    }
    // Web: auto-enable demo (AdSense policy requires real content to be visible)
    enableDemoMode();
    setDemoActive(true);
    return null;
  }

  // Authenticated or demo
  const appRoutes = (
    <Routes>
      <Route path="/" element={<Game />} />
      <Route path="/customize" element={<Game />} />
      <Route path="/play" element={<Game />} />
      <Route path="/gameover" element={<Game />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );

  return (
    <>
      {/* Demo mode banner */}
      {demoActive && !isAuthenticated && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-xs font-pixel text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Local Mode — scores won't sync</span>
          <button onClick={handleSignIn} className="underline underline-offset-2 hover:opacity-80 transition-opacity">
            Sign In
          </button>
        </div>
      )}
      {appRoutes}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
