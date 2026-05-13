import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Palette, ChevronLeft, ChevronRight, Settings, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLevelConfig } from '@/lib/levelConfig';
import { MAX_CUPS } from '@/lib/cupSkins';
import { isDemoMode, DEMO_MAX_LEVEL } from '@/lib/demoMode';
import SettingsModal from '@/components/game/SettingsModal';
import TutorialModal from '@/components/game/TutorialModal';
import NavigationHeader from '@/components/game/NavigationHeader';
import StreakBadge from '@/components/game/StreakBadge';

const LEVEL_COUNT = 500;
const PAGE_SIZE = 40; // 8x5 grid per page

export default function LevelSelect({ profile, nextRefillIn, onPlay, onShowCustomizer, onWatchAd, onReload, soundEnabled, onToggleSound, onTestSound }) {
  const isDemo = isDemoMode();
  const highestLevel = Math.min(profile?.highest_level || 1, isDemo ? DEMO_MAX_LEVEL : Infinity);
  const cups = profile?.cups ?? 0;
  const noCups = cups <= 0;

  const [page, setPage] = useState(Math.floor((highestLevel - 1) / PAGE_SIZE));
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    if (isDemo) return true;
    return !localStorage.getItem('puredrop_tutorial_seen');
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showNoCupsAlert, setShowNoCupsAlert] = useState(false);
  const totalPages = Math.ceil(LEVEL_COUNT / PAGE_SIZE);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const scrollRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(async (e) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    const atTop = !scrollRef.current || scrollRef.current.scrollTop === 0;
    if (delta > 60 && atTop && !refreshing && onReload) {
      setRefreshing(true);
      await onReload();
      setRefreshing(false);
    }
  }, [refreshing, onReload]);

  const pageStart = page * PAGE_SIZE + 1;
  const pageEnd   = Math.min(pageStart + PAGE_SIZE - 1, LEVEL_COUNT);
  const levels    = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center w-full max-w-sm mx-auto"
    >
      {/* Sticky header — NOT inside the scroll container so pull-to-refresh can't fight it */}
      <NavigationHeader />

      {/* Scrollable body — pull-to-refresh only fires when at top */}
      <div
        ref={scrollRef}
        className="w-full overflow-y-auto"
        style={{ overscrollBehavior: 'contain', maxHeight: 'calc(100dvh - 56px - env(safe-area-inset-bottom))' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing...
        </div>
      )}

      {/* Hero Banner */}
      <div className="w-full relative overflow-hidden mb-2" style={{ height: 160 }}>
        {/* Sky gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0d2b5e 0%, #1a4d8c 60%, #1565c0 100%)' }} />
        {/* Clouds */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="60" cy="55" rx="38" ry="22" fill="white" opacity="0.13" />
          <ellipse cx="85" cy="44" rx="28" ry="18" fill="white" opacity="0.13" />
          <ellipse cx="105" cy="55" rx="32" ry="20" fill="white" opacity="0.13" />
          <ellipse cx="240" cy="40" rx="45" ry="25" fill="white" opacity="0.10" />
          <ellipse cx="270" cy="30" rx="32" ry="20" fill="white" opacity="0.10" />
          <ellipse cx="295" cy="42" rx="36" ry="22" fill="white" opacity="0.10" />
          {/* Rain streaks */}
          {[20,50,80,110,140,170,200,230,260,290,320,350].map((x, i) => (
            <line key={i} x1={x} y1={0} x2={x - 4} y2={30} stroke="#a0dcff" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
          ))}
          {[35,65,95,125,155,185,215,245,275,305,335].map((x, i) => (
            <line key={i} x1={x} y1={20} x2={x - 4} y2={55} stroke="#a0dcff" strokeWidth="1.5" opacity="0.18" strokeLinecap="round" />
          ))}
        </svg>
        {/* Ground strip */}
        <div className="absolute bottom-0 left-0 right-0 h-6" style={{ background: 'linear-gradient(180deg, #2ecc71 0%, #1a5c32 100%)' }} />
        {/* Grass tufts SVG */}
        <svg className="absolute bottom-5 w-full" viewBox="0 0 360 14" preserveAspectRatio="none">
          {[10,38,66,94,122,150,178,206,234,262,290,318,346].map((x, i) => (
            <g key={i}>
              <line x1={x} y1={14} x2={x - 4} y2={4} stroke="#57e88a" strokeWidth="2" strokeLinecap="round" />
              <line x1={x + 7} y1={14} x2={x + 3} y2={5} stroke="#57e88a" strokeWidth="2" strokeLinecap="round" />
            </g>
          ))}
        </svg>
        {/* Big drop icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 20 }}>
          <span className="text-5xl drop-shadow-lg">💧</span>
          <h1 className="font-pixel text-white text-xl mt-1 drop-shadow-lg" style={{ textShadow: '0 2px 8px #0369a1' }}>PureDrop</h1>
          <p className="text-blue-200 text-[10px] mt-0.5 font-pixel opacity-80">Catch the rain. Keep it pure.</p>
        </div>
        {/* Settings button overlay */}
        <button
          onClick={() => setShowSettings(true)}
          className="absolute top-2 right-2 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
          style={{ minWidth: 36, minHeight: 36 }}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center w-full px-4 pb-6">

      {/* No cups alert */}
      <AnimatePresence>
        {showNoCupsAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-destructive/10 border border-destructive/50 rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
          >
            <div>
              <p className="font-pixel text-[10px] text-destructive mb-0.5">No cups left!</p>
              <p className="text-xs text-muted-foreground">Watch an ad for a free cup, or wait {nextRefillIn} for a refill.</p>
            </div>
            <button onClick={() => setShowNoCupsAlert(false)} className="ml-2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isDemo && (
        <div className="w-full bg-accent/10 border border-accent/40 rounded-xl px-4 py-3 mb-3 text-center">
          <p className="font-pixel text-[10px] text-accent mb-1">Demo — 5 Levels & 3 Cups</p>
          <p className="text-xs text-muted-foreground">Sign in to unlock all 500 levels & unlimited progress!</p>
        </div>
      )}

      <p className="text-muted-foreground text-xs mb-3">Select a level to play</p>

      <StreakBadge streak={profile?.streak} />

      {/* Compact cups + actions row */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        {/* Cups */}
        <div className="flex items-center gap-1.5 bg-card/60 border border-border/50 rounded-xl px-3 py-2 flex-1 min-w-0">
          {cups >= 99 ? (
            <span className="font-pixel text-xs text-accent">∞ Cups</span>
          ) : (
            <>
              <div className="flex gap-0.5">
                {Array.from({ length: MAX_CUPS }).map((_, i) => (
                  <span key={i} className={`text-base transition-all ${i < cups ? 'opacity-100' : 'opacity-20'}`}>🥤</span>
                ))}
              </div>
              {nextRefillIn && (
                <span className="text-[10px] text-muted-foreground ml-1 truncate">+1 in {nextRefillIn}</span>
              )}
            </>
          )}
        </div>
        {/* Ad button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onWatchAd}
          className="font-pixel text-[10px] border-accent text-accent hover:bg-accent/10 shrink-0 px-2"
        >
          📺 +1
        </Button>
        {/* Customize */}
        <Button
          variant="outline"
          size="sm"
          onClick={onShowCustomizer}
          className="font-pixel text-[10px] shrink-0 px-2"
        >
          <Palette className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Page label */}
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs text-muted-foreground font-pixel">
          Levels {pageStart}–{pageEnd}
        </span>
        <span className="text-xs text-muted-foreground">
          {getLevelConfig(Math.min(pageStart + 1, highestLevel)).label}
        </span>
      </div>

      {/* Level grid — min 44px tap targets */}
      <div className="grid grid-cols-8 gap-1 w-full mb-3">
        {levels.map(lvl => {
          const isUnlocked = lvl <= highestLevel && (!isDemo || lvl <= DEMO_MAX_LEVEL);
          const isCurrent  = lvl === highestLevel;

          return (
            <motion.button
              key={lvl}
              whileTap={isUnlocked && !noCups ? { scale: 0.85 } : {}}
              onClick={() => {
                if (!isUnlocked) return;
                if (noCups) { setShowNoCupsAlert(true); return; }
                onPlay(lvl);
              }}
              disabled={!isUnlocked}
              style={{ minHeight: 44 }}
              className={`
                relative rounded-lg border flex flex-col items-center justify-center transition-all
                ${isCurrent ? 'border-primary bg-primary/15 shadow-md shadow-primary/20' : ''}
                ${isUnlocked && !isCurrent ? 'border-border/50 bg-card/60 hover:border-primary/50 active:border-primary/70 active:bg-primary/10' : ''}
                ${!isUnlocked ? 'border-border/10 bg-card/10 opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={`Level ${lvl}`}
            >
              {isUnlocked ? (
                <span className="font-pixel text-[12px] text-foreground leading-tight">{lvl}</span>
              ) : (
                <Lock className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-3 mb-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-pixel text-xs text-muted-foreground">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} soundEnabled={soundEnabled} onToggleSound={onToggleSound} onTestSound={onTestSound} />}
      <AnimatePresence>
        {showTutorial && (
          <TutorialModal onClose={() => {
            if (!isDemo) localStorage.setItem('puredrop_tutorial_seen', 'true');
            setShowTutorial(false);
          }} />
        )}
      </AnimatePresence>
      </div>{/* end scrollable body */}
      </div>{/* end scroll container */}
    </motion.div>
  );
}