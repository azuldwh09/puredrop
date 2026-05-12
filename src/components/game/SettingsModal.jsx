import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, LogOut, HelpCircle, EyeOff, Volume2, VolumeX, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import { getProfile, updateProfile, deleteProfile, removeLeaderboardEntriesForUser, deleteLevelScoresForUser } from '@/lib/firebaseDb';
import TutorialModal from '@/components/game/TutorialModal';
import { isDemoMode } from '@/lib/demoMode';
import { useAuth } from '@/lib/AuthContext';

export default function SettingsModal({ onClose, soundEnabled = true, onToggleSound }) {
  const { logout, navigateToLogin } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcDone, setRecalcDone] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hideFromLeaderboard, setHideFromLeaderboard] = useState(false);
  const [confirmLeaderboardOpt, setConfirmLeaderboardOpt] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('puredrop_dark_mode');
    if (saved === null) return 'system';
    return saved === 'true' ? 'dark' : 'light';
  });

  const applyTheme = (mode) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('light', !isDark);
    if (mode === 'system') {
      localStorage.removeItem('puredrop_dark_mode');
    } else {
      localStorage.setItem('puredrop_dark_mode', String(mode === 'dark'));
    }
  };

  const selectTheme = (mode) => {
    setThemeMode(mode);
    applyTheme(mode);
  };

  useEffect(() => {
    // Sync with current state on open (no-op, state already initialized correctly)

    if (isDemoMode()) return; // local mode — no server profile
    const load = async () => {
      const user = await getCurrentFirebaseUser();
      const p = await getProfile(user.uid);
      if (p) {
        setProfileId(user.uid);
        setHideFromLeaderboard(p.hide_from_leaderboard || false);
      }
    };
    load();
  }, []);



  const handleLeaderboardToggle = () => {
    if (!hideFromLeaderboard) {
      // Opting out — show confirmation first
      setConfirmLeaderboardOpt(true);
    } else {
      // Opting back in — no confirmation needed
      doToggleLeaderboard(false);
    }
  };

  const doToggleLeaderboard = async (newVal) => {
    if (!profileId) return;
    setHideFromLeaderboard(newVal);
    setConfirmLeaderboardOpt(false);
    await updateProfile(profileId, { hide_from_leaderboard: newVal });
    if (newVal) {
      const user = await getCurrentFirebaseUser();
      await removeLeaderboardEntriesForUser(user.uid);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try {
      // Delete all player data for the current user
      const user = await getCurrentFirebaseUser();
      await deleteProfile(user.uid);
      await deleteLevelScoresForUser(user.uid);
      await removeLeaderboardEntriesForUser(user.uid);
      logout();
    } catch (e) {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs mx-4 relative"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="absolute top-2 right-2 rounded-lg text-muted-foreground hover:text-foreground active:bg-muted/50 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          <h2 className="font-pixel text-sm text-foreground mb-6">Settings</h2>

          <div className="space-y-3">
            {/* Sound toggle */}
            <button
              onClick={onToggleSound}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 bg-card/50 hover:border-primary/40 active:border-primary/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs text-foreground">
                {soundEnabled
                  ? <Volume2 className="w-3.5 h-3.5 text-primary" />
                  : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                Sound
              </span>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${soundEnabled ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Theme selector */}
            <div className="px-3 py-2.5 rounded-lg border border-border/60 bg-card/50">
              <span className="text-xs text-foreground block mb-2">Theme</span>
              <div className="flex gap-1.5">
                {[
                  { mode: 'light', label: 'Light', Icon: Sun },
                  { mode: 'system', label: 'System', Icon: Monitor },
                  { mode: 'dark', label: 'Dark', Icon: Moon },
                ].map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => selectTheme(mode)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-colors border ${
                      themeMode === mode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 text-muted-foreground border-transparent hover:border-primary/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full font-pixel text-xs"
              onClick={() => setShowTutorial(true)}
            >
              <HelpCircle className="w-3 h-3 mr-2" />
              How to Play
            </Button>
            {!isDemoMode() && (
              <Button
                variant="outline"
                size="sm"
                className="w-full font-pixel text-xs"
                disabled={recalculating || recalcDone}
                onClick={async () => {
                  setRecalculating(true);
                  try {
                    // recalculateStars not available with Firestore backend
                    setRecalcDone(true);
                  } finally {
                    setRecalculating(false);
                  }
                }}
              >
                ★ {recalcDone ? 'Stars Updated!' : recalculating ? 'Recalculating...' : 'Recalculate Stars'}
              </Button>
            )}
            {!isDemoMode() && (
              <>
                <button
                  onClick={handleLeaderboardToggle}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 bg-card/50 hover:border-primary/40 active:border-primary/60 transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs text-foreground">
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    Hide from leaderboard
                  </span>
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${hideFromLeaderboard ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hideFromLeaderboard ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
                {confirmLeaderboardOpt && (
                  <div className="flex flex-col gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                    <div className="flex items-start gap-2 text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>Your existing leaderboard scores will be permanently removed and cannot be recovered. Are you sure?</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => doToggleLeaderboard(true)}>
                        Yes, hide me
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => setConfirmLeaderboardOpt(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full font-pixel text-xs"
              onClick={() => isDemoMode() ? navigateToLogin() : logout(true)}
            >
              <LogOut className="w-3 h-3 mr-2" />
              {isDemoMode() ? 'Sign In / Create Account' : 'Sign Out'}
            </Button>
            <a
              href="/privacy-policy#deletion"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-primary underline underline-offset-2 py-2 hover:text-primary/80 transition-colors"
            >
              Request Account & Data Deletion
            </a>
            <div className="border border-border/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-3">
                Danger Zone — this cannot be undone.
              </p>
              {confirming && (
                <div className="flex items-start gap-2 mb-3 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>All progress will be permanently deleted. Are you sure?</span>
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="w-full font-pixel text-xs"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                {deleting ? 'Deleting...' : confirming ? 'Yes, Delete Everything' : 'Delete Account'}
              </Button>
              {confirming && !deleting && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showTutorial && (
          <TutorialModal onClose={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}