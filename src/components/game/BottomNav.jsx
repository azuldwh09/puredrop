import { useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Palette, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const TABS = [
  { label: 'Play', icon: Gamepad2, path: '/', ariaLabel: 'Play game' },
  { label: 'Ranks', icon: Trophy, path: '/leaderboard', ariaLabel: 'Leaderboard' },
  { label: 'Customize', icon: Palette, path: '/customize', ariaLabel: 'Customize cup' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Play tab is "active" for /, /customize, /play, /gameover
  const isPlayTab = (path) => path === '/' && ['/', '/customize', '/play', '/gameover'].includes(pathname);

  const handleTabPress = (path) => {
    const alreadyActive = pathname === path || isPlayTab(path);
    if (alreadyActive) {
      // Re-tapping active tab resets to its root
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  };

  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingLeft: 16, paddingRight: 16 }}
    >
      <div className="flex pointer-events-auto bg-card/95 backdrop-blur border border-border/60 rounded-2xl shadow-xl overflow-hidden">
        {TABS.map(({ label, icon: Icon, path, ariaLabel }) => {
          const active = pathname === path || (path === '/' && ['/play', '/gameover', '/customize'].includes(pathname));
          return (
            <button
              key={path}
              role="tab"
              aria-label={ariaLabel}
              aria-selected={active}
              onClick={() => handleTabPress(path)}
              className={`relative flex flex-col items-center justify-center gap-1 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              }`}
              style={{ minWidth: 72, minHeight: 56, paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }}
            >
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
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