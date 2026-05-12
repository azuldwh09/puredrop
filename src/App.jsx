import React from 'react';
import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { enableDemoMode, isDemoMode, disableDemoMode } from '@/lib/demoMode';
import Game from './pages/Game';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LeaderboardPage from './pages/LeaderboardPage';
import DiagPanel from '@/components/game/DiagPanel';

// ─── Sign-In Screen ────────────────────────────────────────────────────────
const SignInScreen = ({ onSignIn, onDemo, isLoading, error }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background px-8">
    <div className="flex flex-col items-center gap-2 mb-4">
      <span className="text-6xl">💧</span>
      <h1 className="font-pixel text-2xl text-foreground tracking-widest">PureDrop</h1>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Catch drops. Beat levels. Climb the leaderboard.
      </p>
    </div>

    {isLoading ? (
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
    ) : (
      <>
        {error && (
          <p className="text-xs text-red-400 text-center px-4">{error.message}</p>
        )}
        <button
          onClick={onSignIn}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl shadow-md border border-gray-200 active:opacity-70 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.6 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.1-6.2z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-8.1 6.2C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
        <button
          onClick={onDemo}
          className="text-sm text-muted-foreground underline underline-offset-4 active:opacity-60 transition-opacity"
        >
          Play without signing in
        </button>
      </>
    )}
  </div>
);

// ─── Main App Shell ────────────────────────────────────────────────────────
const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authError, navigateToLogin } = useAuth();
  const [demoActive, setDemoActive] = React.useState(isDemoMode());

  // If user signs in while in demo mode, exit demo mode
  React.useEffect(() => {
    if (isAuthenticated && demoActive) {
      disableDemoMode();
      setDemoActive(false);
    }
  }, [isAuthenticated, demoActive]);

  // Inject AdSense once user is in the app (authenticated or demo)
  React.useEffect(() => {
    if ((isAuthenticated || demoActive) && !document.getElementById('adsense-script')) {
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
  }, [isAuthenticated, demoActive]);

  // ── Loading — wait for Firebase session restore ──
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not signed in and not in demo → show sign-in screen ──
  if (!isAuthenticated && !demoActive) {
    return (
      <SignInScreen
        onSignIn={navigateToLogin}
        onDemo={() => { enableDemoMode(); setDemoActive(true); }}
        isLoading={isLoadingAuth}
        error={authError?.type === 'auth_failed' ? authError : null}
      />
    );
  }

  // ── Authenticated or demo → show game ──
  return (
    <>
      {demoActive && !isAuthenticated && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-xs font-pixel text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Local Mode — scores won't sync to leaderboard</span>
          <button onClick={navigateToLogin} className="underline underline-offset-2 active:opacity-70">
            Sign In
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
};

// ─── Root ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      <DiagPanel />
    </AuthProvider>
  );
}

export default App;
