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
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, checkAppState } = useAuth();
  const [demoActive, setDemoActive] = React.useState(isDemoMode());

  // When user returns from OAuth login, re-check auth and exit demo mode if now authenticated
  React.useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && demoActive) {
      disableDemoMode();
      setDemoActive(false);
    }
  }, [isAuthenticated, isLoadingAuth, demoActive]);

  // Load AdSense only when user is on real content (authenticated or demo)
  React.useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && (!authError || demoActive)) {
      if (!document.getElementById('adsense-script')) {
        const script = document.createElement('script');
        script.id = 'adsense-script';
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2912984715921362';
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);

        // Initialize H5 Games Ads API (adBreak / adConfig)
        if (!window.adBreak) {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adBreak = window.adConfig = function(o) { window.adsbygoogle.push(o); };
          // Configure for rewarded ads
          window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
        }
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError, demoActive]);

  const handleDemo = () => {
    enableDemoMode();
    setDemoActive(true);
  };

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow demo mode to bypass auth
  if (demoActive) {
    return (
      <>
        {/* Non-blocking sign-in nudge for unauthenticated demo users */}
        {!isAuthenticated && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-xs font-pixel text-center py-2 px-4 flex items-center justify-center gap-3">
            <span>Local Mode — scores won't appear on the global leaderboard</span>
            <button
              onClick={navigateToLogin}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Sign In to sync
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/customize" element={<Game />} />
          <Route path="/play" element={<Game />} />
          <Route path="/gameover" element={<Game />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Auto-enable demo so visitors land on real game content (satisfies AdSense policy)
      if (!demoActive) {
        enableDemoMode();
        setDemoActive(true);
      }
      return null;
    }
  }

  // Render the main app
  return (
    <>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/customize" element={<Game />} />
        <Route path="/play" element={<Game />} />
        <Route path="/gameover" element={<Game />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
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
  )
}

export default App