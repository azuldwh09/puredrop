// =============================================================================
// APP ROOT -- src/App.jsx
// =============================================================================
// The top-level component that wires together:
//   - Firebase authentication (AuthProvider)
//   - React Query data-fetching cache (QueryClientProvider)
//   - Client-side routing (BrowserRouter -> Routes)
//   - The game itself (AuthenticatedApp -> Game page)
//
// Rendering logic (AuthenticatedApp):
//   1. While Firebase is restoring the session:  show a loading spinner
//   2. Not signed in AND not in demo mode:        show the SignInScreen
//   3. Signed in OR demo mode:                    show the game
//
// Demo mode:
//   The "Play without signing in" button enables demo mode. The player can
//   play locally but their scores are NOT synced to the leaderboard.
//   A banner at the top of the game prompts them to sign in.
//   Demo mode is automatically exited when the user signs in.
//
// AdSense injection:
//   The Google AdSense script is added to <head> once the user reaches the
//   game (authenticated or demo). It is only injected once per session.
// =============================================================================

import React from 'react';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { enableDemoMode, isDemoMode, disableDemoMode } from '@/lib/demoMode';
import Game from './pages/Game';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LeaderboardPage from './pages/LeaderboardPage';

// =============================================================================
// Sign-In Screen
// =============================================================================
// Shown when the user is not authenticated and not in demo mode.
// Offers two options:
//   - "Sign in with Google" -- triggers OAuth via AuthContext.navigateToLogin()
//   - "Play without signing in" -- enables demo mode (local-only, no leaderboard)
const SignInScreen = ({ onSignIn, onDemo, isLoading, error }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background px-8">

    {/* App logo and tagline */}
    <div className="flex flex-col items-center gap-2 mb-4">
      <span className="text-6xl">💧</span>
      <h1 className="font-pixel text-2xl text-foreground tracking-widest">PureDrop</h1>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Catch drops. Beat levels. Climb the leaderboard.
      </p>
    </div>

    {/* Loading spinner while sign-in is in progress */}
    {isLoading ? (
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
    ) : (
      <>
        {/* Error message from a failed sign-in attempt */}
        {error && (
          <p className="text-xs text-red-400 text-center px-4">{error.message}</p>
        )}

        {/* Google Sign-In button (styled to match Google's brand guidelines) */}
        <button
          onClick={onSignIn}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl shadow-md border border-gray-200 active:opacity-70 transition-opacity"
        >
          {/* Google 'G' logo SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.6 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.1-6.2z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-8.1 6.2C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Demo mode opt-out link */}
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

// =============================================================================
// AuthenticatedApp
// =============================================================================
// The inner shell that reads auth state and decides what to render.
// This is a separate component (not inlined in App) so it can call useAuth(),
// which requires being inside <AuthProvider>.
const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authError, navigateToLogin } = useAuth();
  const [demoActive, setDemoActive] = React.useState(isDemoMode());

  // -- Auto-exit demo mode when the user signs in ----------------------------
  // If someone was playing in demo mode and then signs in, disable demo mode
  // so their subsequent plays sync to the leaderboard.
  React.useEffect(() => {
    if (isAuthenticated && demoActive) {
      disableDemoMode();
      setDemoActive(false);
    }
  }, [isAuthenticated, demoActive]);

  // -- Inject AdSense script once the user reaches the game -----------------
  // We inject it here (not in index.html) so it only loads after auth
  // completes. We guard with the 'adsense-script' id to avoid double injection.
  React.useEffect(() => {
    if ((isAuthenticated || demoActive) && !document.getElementById('adsense-script')) {
      const script = document.createElement('script');
      script.id           = 'adsense-script';
      script.async        = true;
      script.src          = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2912984715921362';
      script.crossOrigin  = 'anonymous';
      document.head.appendChild(script);

      // Configure the H5 Ad API for rewarded ad breaks (used in AdModal)
      if (!window.adBreak) {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
        window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
      }
    }
  }, [isAuthenticated, demoActive]);

  // -- 1. Loading state -- Firebase is still restoring the session -----------
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -- 2. Not signed in and not in demo mode: show the sign-in screen --------
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

  // -- 3. Authenticated or demo mode: show the game --------------------------
  return (
    <>
      {/* Demo mode banner -- shown above the game to encourage sign-in */}
      {demoActive && !isAuthenticated && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-xs font-pixel text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Local Mode -- scores won't sync to leaderboard</span>
          <button onClick={navigateToLogin} className="underline underline-offset-2 active:opacity-70">
            Sign In
          </button>
        </div>
      )}

      {/* App routes -- all go through the Game page except leaderboard and privacy */}
      <Routes>
        <Route path="/"              element={<Game />} />
        <Route path="/customize"     element={<Game />} />
        <Route path="/play"          element={<Game />} />
        <Route path="/gameover"      element={<Game />} />
        <Route path="/leaderboard"   element={<LeaderboardPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*"              element={<PageNotFound />} />
      </Routes>
    </>
  );
};

// =============================================================================
// App (root)
// =============================================================================
// Wraps everything in the required providers:
//   AuthProvider      -- Firebase auth state (must be outermost)
//   QueryClientProvider -- React Query cache for any data-fetching hooks
//   Router            -- enables useNavigate / useLocation in child components
//   Toaster           -- toast notification system (from sonner)
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
