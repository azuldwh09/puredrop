import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Palette, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_CUPS } from '@/lib/cupSkins';
import { isDemoMode, DEMO_MAX_LEVEL } from '@/lib/demoMode';
import { useLevelScores } from '@/hooks/useLevelScores';
import LevelCard from '@/components/game/LevelCard';
import SettingsModal from '@/components/game/SettingsModal';
import TutorialModal from '@/components/game/TutorialModal';
import StreakBadge from '@/components/game/StreakBadge';
import AdminLevelJump from '@/components/game/AdminLevelJump';
import PullToRefresh from '@/components/game/PullToRefresh';

const LEVEL_COUNT = 500;
// How many cards visible in the "window"
const VISIBLE = 3;

export default function LevelCarousel({
  profile, nextRefillIn, onPlay, onShowCustomizer, onWatchAd, onReload,
  soundEnabled, onToggleSound,
}) {
  const isDemo = isDemoMode();
  const highestLevel = profile?.highest_level || 1;
  const cups = profile?.cups ?? 0;
  const noCups = cups <= 0;

  const { levelData } = useLevelScores();

  // Center the carousel on highest unlocked level
  const [centerLevel, setCenterLevel] = useState(highestLevel);
  const [showSettings, setShowSettings] = useState(false);
  const [showNoCupsAlert, setShowNoCupsAlert] = useState(false);
  const [refreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    if (isDemo) return true;
    return !localStorage.getItem('puredrop_tutorial_seen');
  });

  // Track direction for slide animation
  const [direction, setDirection] = useState(0); // -1 = going left, 1 = going right

  // Drag / swipe
  const dragStartX = useRef(null);
  const isDragging = useRef(false);

  const goLeft = useCallback(() => { setDirection(-1); setCenterLevel(l => Math.max(1, l - 1)); }, []);
  const goRight = useCallback(() => { setDirection(1); setCenterLevel(l => Math.min(LEVEL_COUNT, l + 1)); }, []);

  const handleDragStart = (e) => {
    dragStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    isDragging.current = true;
  };
  const handleDragEnd = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const delta = endX - dragStartX.current;
    if (delta < -40) goRight();
    else if (delta > 40) goLeft();
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goLeft();
      if (e.key === 'ArrowRight') goRight();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goLeft, goRight]);

  const scrollRef = useRef(null);
  const handlePullRefresh = useCallback(async () => {
    if (onReload) await onReload();
  }, [onReload]);

  // The 5 cards to render: center ± 2
  const cardLevels = [-2, -1, 0, 1, 2].map(offset => centerLevel + offset).filter(l => l >= 1 && l <= LEVEL_COUNT);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center w-full max-w-sm mx-auto"
    >
      {/* Scrollable body with pull-to-refresh */}
      <PullToRefresh onRefresh={handlePullRefresh} scrollRef={scrollRef}>
      <div
        ref={scrollRef}
        className="w-full overflow-y-auto"
        style={{ overscrollBehavior: 'none', maxHeight: '100dvh' }}
      >

        {/* Hero Banner */}
        <div className="w-full relative overflow-hidden mb-0" style={{ height: 160 }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0d2b5e 0%, #1a4d8c 60%, #1565c0 100%)' }} />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice">
            <ellipse cx="60" cy="55" rx="38" ry="22" fill="white" opacity="0.13" />
            <ellipse cx="85" cy="44" rx="28" ry="18" fill="white" opacity="0.13" />
            <ellipse cx="240" cy="40" rx="45" ry="25" fill="white" opacity="0.10" />
            <ellipse cx="270" cy="30" rx="32" ry="20" fill="white" opacity="0.10" />
            {[20,50,80,110,140,170,200,230,260,290,320,350].map((x, i) => (
              <line key={i} x1={x} y1={0} x2={x - 4} y2={30} stroke="#a0dcff" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
            ))}
          </svg>
          <div className="absolute bottom-0 left-0 right-0 h-6" style={{ background: 'linear-gradient(180deg, #2ecc71 0%, #1a5c32 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 20 }}>
            <span className="text-5xl drop-shadow-lg">💧</span>
            <h1 className="font-pixel text-white text-xl mt-1 drop-shadow-lg" style={{ textShadow: '0 2px 8px #0369a1' }}>PureDrop</h1>
            <p className="text-blue-200 text-[10px] mt-0.5 font-pixel opacity-80">Catch the rain. Keep it pure.</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            className="absolute top-2 right-2 rounded-xl text-white/70 active:bg-white/20 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col items-center w-full px-4 pb-8 pt-4 gap-3">

          {/* No cups alert */}
          <AnimatePresence>
            {showNoCupsAlert && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="w-full bg-destructive/10 border border-destructive/50 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-pixel text-[10px] text-destructive mb-0.5">No cups left!</p>
                  <p className="text-xs text-muted-foreground">Watch an ad or wait {nextRefillIn}.</p>
                </div>
                <button onClick={() => setShowNoCupsAlert(false)} className="ml-2 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <StreakBadge streak={profile?.streak} />

          {/* Cups + actions row */}
          <div className="w-full flex items-center justify-between gap-2">
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
                  {nextRefillIn && <span className="text-[10px] text-muted-foreground ml-1 truncate">+1 in {nextRefillIn}</span>}
                </>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={onWatchAd}
              className="font-pixel text-[10px] border-accent text-accent shrink-0 px-2">
              📺 +1
            </Button>
            <Button variant="outline" size="sm" onClick={onShowCustomizer}
              className="font-pixel text-[10px] shrink-0 px-2">
              <Palette className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Level label */}
          <p className="text-xs text-muted-foreground font-pixel">Level {centerLevel}</p>

          {/* Carousel */}
          <div
            className="w-full flex items-center justify-center gap-3 select-none"
            style={{ touchAction: 'pan-y' }}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
          >
            {/* Prev arrow */}
            <button
              onClick={goLeft}
              disabled={centerLevel <= 1}
              aria-label="Previous level"
              className="shrink-0 rounded-full bg-card/70 border border-border/50 flex items-center justify-center text-muted-foreground disabled:opacity-20 active:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Cards — 3 visible, centered with slide animation */}
            <div className="flex items-center justify-center gap-2 overflow-hidden" style={{ width: 132 * 3 + 8 * 2 }}>
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                {[-1, 0, 1].map(offset => {
                  const lvl = centerLevel + offset;
                  if (lvl < 1 || lvl > LEVEL_COUNT) return <div key={`empty-${offset}`} style={{ width: 132, flexShrink: 0 }} />;
                  const isUnlocked = lvl <= highestLevel;
                  const isCurrent = lvl === highestLevel;
                  const ld = levelData[lvl] || {};
                  const scale = offset === 0 ? 1 : 0.82;
                  const opacity = offset === 0 ? 1 : 0.55;

                  return (
                    <motion.div
                      key={lvl}
                      custom={direction}
                      initial={(d) => ({ x: d * 60, opacity: 0, scale: scale * 0.85 })}
                      animate={{ x: 0, scale, opacity, transition: { type: 'spring', stiffness: 320, damping: 30 } }}
                      exit={(d) => ({ x: d * -60, opacity: 0, scale: scale * 0.85, transition: { duration: 0.15 } })}
                      style={{ flexShrink: 0, width: 132, originX: 0.5, originY: 0.5 }}
                    >
                      <LevelCard
                        level={lvl}
                        isUnlocked={isUnlocked}
                        isCurrent={isCurrent}
                        stars={ld.stars || 0}
                        highScore={ld.highScore ?? null}
                        onClick={() => {
                          if (!isUnlocked) return;
                          if (noCups) { setShowNoCupsAlert(true); return; }
                          onPlay(lvl);
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Next arrow */}
            <button
              onClick={goRight}
              disabled={centerLevel >= LEVEL_COUNT}
              aria-label="Next level"
              className="shrink-0 rounded-full bg-card/70 border border-border/50 flex items-center justify-center text-muted-foreground disabled:opacity-20 active:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Swipe hint */}
          <p className="text-[10px] text-muted-foreground opacity-60">← swipe to browse levels →</p>

          {/* Admin-only level jump */}
          {!isDemo && (
            <AdminLevelJump onJump={setCenterLevel} maxLevel={LEVEL_COUNT} />
          )}

          {/* Jump to current */}
          {centerLevel !== highestLevel && (
            <button
              onClick={() => setCenterLevel(highestLevel)}
              className="text-xs text-primary underline underline-offset-2 font-pixel"
            >
              → Jump to current level ({highestLevel})
            </button>
          )}

          {/* Play button */}
          <Button
            size="lg"
            className="w-full font-pixel text-sm mt-1"
            disabled={noCups || !(centerLevel <= highestLevel)}
            onClick={() => {
              if (noCups) { setShowNoCupsAlert(true); return; }
              onPlay(centerLevel);
            }}
          >
            ▶ Play Level {centerLevel}
          </Button>
        </div>

        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} soundEnabled={soundEnabled} onToggleSound={onToggleSound} />
        )}
        <AnimatePresence>
          {showTutorial && (
            <TutorialModal onClose={() => {
              if (!isDemo) localStorage.setItem('puredrop_tutorial_seen', 'true');
              setShowTutorial(false);
            }} />
          )}
        </AnimatePresence>
      </div>
      </PullToRefresh>
    </motion.div>
  );
}