// =============================================================================
// BOTTOM NAVIGATION BAR -- src/components/game/BottomNav.jsx
// =============================================================================
// The persistent three-tab navigation bar shown at the bottom of the game.
// Tabs:
//   Play (/)         -- level select / main game flow
//   Customize (/customize) -- cup skin selection
//   Leaderboard (/leaderboard) -- global and personal score tables
//
// IMPORTANT -- why no framer-motion layoutId here:
//   framer-motion's layoutId creates a "shared layout animation" that requires
//   BOTH the source and target elements to be mounted simultaneously.
//   AnimatePresence mode="wait" (used in Game.jsx) unmounts the old screen
//   completely before mounting the new one. If BottomNav uses layoutId, the
//   animation target (in the new screen's BottomNav) doesn't exist yet when
//   the exit animation tries to hand off -- this creates a permanent deadlock
//   where the exit animation never completes and the new screen never appears.
//   FIX: use a plain CSS div with transition-opacity for the active indicator.
//   The visual result is identical and there is no cross-screen dependency.
// =============================================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Palette, Trophy } from 'lucide-react';

// Tab definitions -- matches the router paths in App.jsx
const TABS = [
  { label: 'Play',      icon: Gamepad2, path: '/',            ariaLabel: 'Play game' },
  { label: 'Customize', icon: Palette,  path: '/customize',   ariaLabel: 'Customize cup' },
  { label: 'Scores',    icon: Trophy,   path: '/leaderboard', ariaLabel: 'Leaderboard' },
];

export default function BottomNav() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();

  // Navigate to the tapped tab. If already on that tab, do nothing.
  const handleTabPress = (path) => {
    if (pathname === path) return;
    navigate(path);
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-card/95 backdrop-blur-md border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 64 }}
    >
      <div className="flex w-full max-w-sm mx-auto">
        {TABS.map(({ label, icon: Icon, path, ariaLabel }) => {
          const active = pathname === path;

          return (
            <button
              key={path}
              role="tab"
              aria-label={ariaLabel}
              aria-selected={active}
              onClick={() => handleTabPress(path)}
              className={`
                relative flex flex-col items-center justify-center gap-1 select-none
                transition-colors duration-150 flex-1
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                ${active ? 'text-primary' : 'text-muted-foreground active:text-foreground'}
              `}
              style={{ minHeight: 56, paddingTop: 10, paddingBottom: 10 }}
            >
              {/* Active indicator background -- plain CSS, no layoutId animation */}
              {active && (
                <div className="absolute inset-0 bg-primary/10 rounded-2xl transition-opacity duration-150" />
              )}
              <Icon className="w-5 h-5 relative z-10" aria-hidden="true" />
              <span className="font-pixel text-[8px] relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
