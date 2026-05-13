import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import GameCanvas from '../components/game/GameCanvas';
import GameHUD from '../components/game/GameHUD';
import GameOverScreen from '../components/game/GameOverScreen';
import StartScreen from '../components/game/StartScreen';
import LevelSelect from '../components/game/LevelSelect';
import LevelCarousel from '../components/game/LevelCarousel';
import CupCustomizer from '../components/game/CupCustomizer';
import AdModal from '../components/game/AdModal';
import Countdown from '../components/game/Countdown';
import PauseOverlay from '../components/game/PauseOverlay';
import NavigationHeader from '../components/game/NavigationHeader';
import BottomNav from '../components/game/BottomNav';
import { usePlayerProfile, computeStars } from '@/hooks/usePlayerProfile';
import { useLevelScores } from '@/hooks/useLevelScores';
import { useGameAudio } from '@/hooks/useGameAudio';
import { useSoundSettings } from '@/hooks/useSoundSettings';
import { getLevelConfig } from '@/lib/levelConfig';
import { CUP_SKINS } from '@/lib/cupSkins';
import { getCupTheme } from '@/lib/cupThemes';
import { POWER_UPS } from '@/lib/powerUps';

const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;
const CUP_WIDTH = 70;
const CUP_HEIGHT = 50;
const CUP_SPEED = 14;
const OBSTACLE_SIZE = 40;
const DROP_SIZE = 22;
const SPILL_COST = 8;

export const ITEM_TYPES = {
  CLEAN: 'clean',
  DIRTY: 'dirty',
  ROCK: 'rock',
  BALL: 'ball',
  CAT: 'cat',
  POWERUP: 'powerup',
};

function randomBetween(a, b) {
  return Math.random() * (b - a) + a;
}

// Map URL paths to screen names
const PATH_TO_SCREEN = {
  '/': 'levelselect',
  '/customize': 'customize',
  '/play': 'playing',
  '/gameover': 'gameover',
};
const SCREEN_TO_PATH = {
  levelselect: '/',
  customize: '/customize',
  playing: '/play',
  gameover: '/gameover',
};

export default function Game() {
  const { profile, loading, spendCup, addCup, setSkin, updateProgress, nextRefillIn, reload } = usePlayerProfile();
  const { levelData, recordLocal: recordLocalLevel, refresh: refreshLevelScores } = useLevelScores();
  const { soundEnabled, toggleSound } = useSoundSettings();
  const audio = useGameAudio(soundEnabled);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive screen from URL; fall back to levelselect
  const screen = PATH_TO_SCREEN[location.pathname] || 'levelselect';
  const setScreen = useCallback((s) => navigate(SCREEN_TO_PATH[s] || '/'), [navigate]);

  const [showAdModal, setShowAdModal] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [countingDown, setCountingDown] = useState(false);
  const [previousHighestLevel, setPreviousHighestLevel] = useState(null);

  // Game state
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [fillAmount, setFillAmount] = useState(0);
  const [purity, setPurity] = useState(100);
  const [items, setItems] = useState([]);
  const [cupX, setCupX] = useState(GAME_WIDTH / 2 - CUP_WIDTH / 2);
  const [effects, setEffects] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [win, setWin] = useState(false);
  const [combo, setCombo] = useState(1);
  const comboRef = useRef(1);
  const cleanDropsSpawnedRef = useRef(0);
  const cleanDropsCaughtRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const spillsThisGameRef = useRef(0);
  const [spillsUsed, setSpillsUsed] = useState(0);


  // Power-up state: activePowerUps maps id -> expiry timestamp (for timed), usedPowerUps tracks spent ones
  const [activePowerUps, setActivePowerUps] = useState({});
  const [usedPowerUps, setUsedPowerUps] = useState({});
  const activePowerUpsRef = useRef({});
  const usedPowerUpsRef = useRef({});
  const lastPowerUpSpawnRef = useRef({});
  useEffect(() => { activePowerUpsRef.current = activePowerUps; }, [activePowerUps]);
  useEffect(() => { usedPowerUpsRef.current = usedPowerUps; }, [usedPowerUps]);

  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const keysRef = useRef({});
  const rafRef = useRef(null);
  const timerRef = useRef(null);
  const itemSpawnRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const cupXRef = useRef(cupX);
  const fillRef = useRef(fillAmount);
  const purityRef = useRef(purity);
  const effectIdRef = useRef(0);
  const spillingRef = useRef(false);

  useEffect(() => { cupXRef.current = cupX; }, [cupX]);
  useEffect(() => { fillRef.current = fillAmount; }, [fillAmount]);
  useEffect(() => { purityRef.current = purity; }, [purity]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const levelConfig = getLevelConfig(currentLevel);
  const skinKey = profile?.selected_cup_skin || 'classic';
  const cupSkin = CUP_SKINS[skinKey] || CUP_SKINS.classic;
  const cupTheme = getCupTheme(skinKey);

  const addEffect = useCallback((x, y, type, text) => {
    const id = ++effectIdRef.current;
    setEffects(prev => [...prev, { id, x, y, type, text }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 1000);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  }, []);

  const spillCup = useCallback((penalize = true) => {
    if (spillingRef.current) return;
    spillingRef.current = true;

    if (penalize) {
      spillsThisGameRef.current += 1;
      setSpillsUsed(spillsThisGameRef.current);
    }

    setFillAmount(0);
    setPurity(100);
    triggerShake();
    if (penalize) {
      setTimeLeft(prev => Math.max(0, prev - SPILL_COST));
      setScore(prev => Math.max(0, prev - 1000));
      setCombo(1);
      comboRef.current = 1;
      spendCup();

      const currentSpills = spillsThisGameRef.current;
      if (currentSpills >= 2) {
        cancelAnimationFrame(rafRef.current);
        clearInterval(itemSpawnRef.current);
        clearTimeout(timerRef.current);
        navigate('/gameover');
      }
    }
    setTimeout(() => { spillingRef.current = false; }, 500);
  }, [triggerShake, spendCup, navigate]);

  const spawnItem = useCallback(() => {
    const cfg = getLevelConfig(currentLevel);
    const pups = activePowerUpsRef.current;
    const used = usedPowerUpsRef.current;
    const now = Date.now();
    const combo = comboRef.current;
    const slowActive = pups.slow_time && pups.slow_time > now;

    // slow_time: skip ~55% of spawn ticks for obstacles and dirty drops to thin generation
    // (spawn interval stays fixed; we probabilistically suppress unwanted spawns)

    // Try to spawn a power-up item if the combo threshold is met and it hasn't been used/spawned recently
    const puList = Object.values(POWER_UPS);
    for (const pu of puList) {
      if (combo >= pu.comboRequired && !used[pu.id]) {
        const lastSpawn = lastPowerUpSpawnRef.current[pu.id] || 0;
        // Spawn at most once every 12 seconds per power-up, with a 4% chance per tick
        if (now - lastSpawn > 12000 && Math.random() < 0.04) {
          lastPowerUpSpawnRef.current[pu.id] = now;
          const x = randomBetween(30, GAME_WIDTH - 30);
          setItems(prev => [...prev, {
            id: ++effectIdRef.current,
            type: ITEM_TYPES.POWERUP, x, y: -30, speed: 2.5, size: 30,
            powerUpId: pu.id,
            wobble: 0,
          }]);
          return; // only spawn one power-up at a time
        }
      }
    }

    // Downpour: only spawn clean drops (don't count toward accuracy)
    if (pups.downpour && pups.downpour > now) {
      const speed = randomBetween(cfg.dropSpeedMin, cfg.dropSpeedMax);
      const x = randomBetween(DROP_SIZE, GAME_WIDTH - DROP_SIZE);
      setItems(prev => [...prev, {
        id: ++effectIdRef.current,
        type: ITEM_TYPES.CLEAN, x, y: -DROP_SIZE, speed, size: DROP_SIZE,
        wobble: randomBetween(-1.5, 1.5),
        downpour: true,
      }]);
      return;
    }

    const rand = Math.random();
    let type;
    if (rand < cfg.cleanChance) type = ITEM_TYPES.CLEAN;
    else if (rand < cfg.cleanChance + cfg.dirtyChance) type = ITEM_TYPES.DIRTY;
    else {
      // Cat toy active: don't spawn cats
      const catBlocked = pups.cat_toy && pups.cat_toy > now;
      const obstacleRand = Math.random();
      if (obstacleRand < 0.4) type = ITEM_TYPES.ROCK;
      else if (obstacleRand < (catBlocked ? 1.0 : 0.75)) type = ITEM_TYPES.BALL;
      else type = ITEM_TYPES.CAT;
    }

    const isObstacle = [ITEM_TYPES.ROCK, ITEM_TYPES.BALL, ITEM_TYPES.CAT].includes(type);
    const isDirty = type === ITEM_TYPES.DIRTY;

    // slow_time: suppress ~55% of obstacle and dirty drop spawn ticks
    if (slowActive && (isObstacle || isDirty) && Math.random() < 0.55) return;

    const size = isObstacle ? OBSTACLE_SIZE : DROP_SIZE;
    // slow_time slows obstacles and dirty drops in movement
    const speedMult = slowActive && (isObstacle || isDirty) ? 0.45 : 1;
    const speed = isObstacle
      ? randomBetween(cfg.obstacleSpeedMin, cfg.obstacleSpeedMax) * speedMult
      : randomBetween(cfg.dropSpeedMin, cfg.dropSpeedMax) * speedMult;
    const x = randomBetween(size, GAME_WIDTH - size);

    setItems(prev => [...prev, {
      id: ++effectIdRef.current,
      type, x, y: -size, speed, size,
      wobble: randomBetween(-1.5, 1.5),
    }]);
  }, [currentLevel]);

  const gameLoop = useCallback(() => {
    const cupLeft = cupXRef.current;
    const cupRight = cupLeft + CUP_WIDTH;
    const cupTop = GAME_HEIGHT - CUP_HEIGHT - 20;
    const cfg = getLevelConfig(currentLevel);

    const pupsNow = activePowerUpsRef.current;
    const nowTs = Date.now();
    const attractActive = pupsNow.attract && pupsNow.attract > nowTs;
    const slowActive = pupsNow.slow_time && pupsNow.slow_time > nowTs;

    setItems(prev => {
      const surviving = [];
      for (const item of prev) {
        // slow_time slows obstacles and dirty drops ONLY.
        // Clean drops, downpour drops, and power-up items keep their normal
        // falling speed so the player can still catch the good stuff at a
        // comfortable pace -- only the things they want to AVOID slow down.
        const isCleanDrop = item.type === ITEM_TYPES.CLEAN;
        const isPowerUp   = item.type === ITEM_TYPES.POWERUP;
        const speedMult   = (slowActive && !isCleanDrop && !isPowerUp) ? 0.45 : 1;
        let newX = item.x;
        // Attract: nudge clean drops toward cup center
        if (attractActive && item.type === ITEM_TYPES.CLEAN) {
          const cupCenter = cupXRef.current + CUP_WIDTH / 2;
          const dx = cupCenter - item.x;
          newX = item.x + Math.sign(dx) * Math.min(Math.abs(dx) * 0.06, 4);
        }
        const newY = item.y + item.speed * speedMult;
        const isObstacle = item.type === ITEM_TYPES.ROCK || item.type === ITEM_TYPES.BALL || item.type === ITEM_TYPES.CAT;
        const itemLeft = newX - item.size / 2;
        const itemRight = newX + item.size / 2;
        const itemBottom = newY + item.size / 2;
        const hitsCup = itemBottom >= cupTop && itemBottom <= cupTop + CUP_HEIGHT + 10
          && itemRight >= cupLeft && itemLeft <= cupRight;

        if (hitsCup) {
          if (item.type === ITEM_TYPES.POWERUP) {
            // Catching a power-up activates it — +500 points
            audio.playPowerUp();
            setScore(s => s + 500);
            addEffect(item.x, newY, 'clean', '+500 ⚡');
            setTimeout(() => activatePowerUpFnRef.current?.(item.powerUpId), 0);
            continue;
          }
          if (isObstacle) {
            if (item.type === ITEM_TYPES.CAT) {
              audio.playCatMeow();
            } else {
              audio.playMiss();
            }
            const onomatopoeia = item.type === ITEM_TYPES.ROCK ? '💥 BONK!'
              : item.type === ITEM_TYPES.BALL ? '🏀 THWACK!'
              : '🐱 MEOW!';
            addEffect(item.x, cupTop, 'spill', onomatopoeia);
            setScore(s => Math.max(0, s - 1000));
            setTimeout(() => spillCup(true), 0);
          } else if (item.type === ITEM_TYPES.CLEAN) {
           if (!item.downpour) {
             cleanDropsSpawnedRef.current += 1;
             cleanDropsCaughtRef.current += 1;
           }
           audio.playcatch();
           setFillAmount(f => Math.min(cfg.fillGoal, f + 4));
           setPurity(p => Math.min(100, p + 1));
           const newCombo = Math.min(comboRef.current + 1, 8);
           comboRef.current = newCombo;
           setCombo(newCombo);
           const pts = 10 * newCombo;
           setScore(s => s + pts);
           addEffect(item.x, newY, 'clean', newCombo > 1 ? `+${pts} x${newCombo}!` : `+${pts}`);
          } else if (item.type === ITEM_TYPES.DIRTY) {
           audio.playMiss();
           setFillAmount(f => Math.min(cfg.fillGoal, f + 3));
           setPurity(p => Math.max(0, p - 15));
           comboRef.current = 1;
           setCombo(1);
           setScore(s => Math.max(0, s - 500));
           addEffect(item.x, newY, 'dirty', '☠️ -500');
          }
          continue;
        }
        if (newY > GAME_HEIGHT + 20) {
          if (item.type === ITEM_TYPES.CLEAN && !item.downpour) {
            // Count as spawned (missed) — not caught
            cleanDropsSpawnedRef.current += 1;
            comboRef.current = 1;
            setCombo(1);
          }
          if (item.type === ITEM_TYPES.POWERUP) {
            // Reset spawn cooldown so it can appear again
            lastPowerUpSpawnRef.current[item.powerUpId] = 0;
          }
          continue;
        }
        surviving.push({ ...item, x: newX, y: newY });
      }
      return surviving;
    });

    if (fillRef.current >= levelConfig.fillGoal && purityRef.current >= 80) {
      setWin(true);
      setScreen('gameover');
    }
  }, [addEffect, spillCup, currentLevel, levelConfig]);

  const moveCup = useCallback(() => {
    audio.startBackgroundMusic(); // Start audio on first key interaction
    const speed = CUP_SPEED + (levelConfig.cupSpeedBonus || 0);
    if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A'])
      setCupX(prev => Math.max(0, prev - speed));
    if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D'])
      setCupX(prev => Math.min(GAME_WIDTH - CUP_WIDTH, prev + speed));
  }, [levelConfig, audio]);

  // Fires on the very first touchstart/pointerdown the canvas sees. This is
  // the gesture that unlocks the AudioContext on Android WebView. Calling it
  // SYNCHRONOUSLY from inside the gesture handler (not awaited / not async)
  // is what satisfies the autoplay policy -- doing it from touchmove is too
  // late on some devices because touchmove may not be classified as a user
  // gesture.
  const handleUserGesture = useCallback(() => {
    audio.initAudio();
    audio.startBackgroundMusic();
  }, [audio]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    audio.startBackgroundMusic(); // Start audio on first interaction
    const touch = e.touches[0];
    const gameRect = e.currentTarget.getBoundingClientRect();
    const scaleX = GAME_WIDTH / gameRect.width;
    const relX = (touch.clientX - gameRect.left) * scaleX;
    const newX = Math.max(0, Math.min(GAME_WIDTH - CUP_WIDTH, relX - CUP_WIDTH / 2));
    setCupX(newX);
    cupXRef.current = newX;
  }, [audio]);

  const handleMouseMove = useCallback((relX) => {
    audio.startBackgroundMusic();
    const newX = Math.max(0, Math.min(GAME_WIDTH - CUP_WIDTH, relX - CUP_WIDTH / 2));
    setCupX(newX);
    cupXRef.current = newX;
  }, [audio]);

  const startGame = useCallback(async (level) => {
    // The Play button click is a guaranteed user gesture -- unlock the
    // AudioContext here so all subsequent sound calls work on Android.
    try { audio.initAudio(); } catch (_) {}
    gameSavedRef.current = false;
    const cfg = getLevelConfig(level);
    // Capture highest_level BEFORE this game starts, so GameOverScreen knows if unlock is genuinely new
    setPreviousHighestLevel(profileRef.current?.highest_level ?? level - 1);
    setCurrentLevel(level);
    setScore(0);
    setTimeLeft(cfg.gameDuration);
    setFillAmount(0);
    setPurity(100);
    setItems([]);
    setEffects([]);
    setCupX(GAME_WIDTH / 2 - CUP_WIDTH / 2);
    setWin(false);
    setCombo(1);
    comboRef.current = 1;
    cleanDropsSpawnedRef.current = 0;
    cleanDropsCaughtRef.current = 0;
    spillingRef.current = false;
    spillsThisGameRef.current = 0;
    setSpillsUsed(0);
    setIsPaused(false);
    isPausedRef.current = false;
    setActivePowerUps({});
    setUsedPowerUps({});
    activePowerUpsRef.current = {};
    usedPowerUpsRef.current = {};
    lastPowerUpSpawnRef.current = {};
    setScreen('playing');
    setCountingDown(true);
    // Audio is unlocked at the top of this function via audio.initAudio().
    // Now start the ambient rain loop -- this gives the level a soft
    // background atmosphere and triggers periodic thunder rumbles via the
    // recursive scheduler inside useGameAudio. Rain is stopped when the
    // game ends (either through normal end-of-level flow or exitGame).
    try { audio.startRain(); } catch (_) {}
  }, [audio]);

  const exitGame = useCallback(() => {
    audio.stopBackgroundMusic();
    audio.stopRain();
    cancelAnimationFrame(rafRef.current);
    clearInterval(itemSpawnRef.current);
    clearTimeout(timerRef.current);
    setCountingDown(false);
    navigate('/');
  }, [navigate, audio]);

  const activatePowerUp = useCallback((id) => {
    const pu = POWER_UPS[id];
    if (!pu) return;

    setUsedPowerUps(prev => ({ ...prev, [id]: true }));
    usedPowerUpsRef.current = { ...usedPowerUpsRef.current, [id]: true };
    addEffect(cupX + CUP_WIDTH / 2, GAME_HEIGHT / 2, 'clean', `${pu.emoji} ${pu.label}!`);

    if (id === 'blaster') {
      setItems(prev => prev.filter(i => i.type !== ITEM_TYPES.ROCK && i.type !== ITEM_TYPES.BALL));
      addEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'clean', '💥 BLASTED!');
      return;
    }

    if (id === 'cat_toy') {
      setItems(prev => prev.filter(i => i.type !== ITEM_TYPES.CAT));
    }

    if (id === 'fast_time') {
      setTimeLeft(prev => prev + 10);
      addEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'clean', '+10s ⚡');
      return;
    }

    const expiry = Date.now() + pu.duration;
    setActivePowerUps(prev => ({ ...prev, [id]: expiry }));
    activePowerUpsRef.current = { ...activePowerUpsRef.current, [id]: expiry };

    setTimeout(() => {
      setActivePowerUps(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, pu.duration);
  }, [cupX, addEffect]);

  // Keep latest callbacks in refs so the intervals don't need to re-register
  const gameLoopFnRef = useRef(null);
  const spawnFnRef = useRef(null);
  const moveFnRef = useRef(null);
  const activatePowerUpFnRef = useRef(null);
  useEffect(() => { gameLoopFnRef.current = gameLoop; }, [gameLoop]);
  useEffect(() => { spawnFnRef.current = spawnItem; }, [spawnItem]);
  useEffect(() => { moveFnRef.current = moveCup; }, [moveCup]);
  useEffect(() => { activatePowerUpFnRef.current = activatePowerUp; }, [activatePowerUp]);

  useEffect(() => {
    if (screen !== 'playing' || countingDown) return;

    const onKeyDown = (e) => { keysRef.current[e.key] = true; };
    const onKeyUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const spawnInterval = getLevelConfig(currentLevel).spawnInterval;
    lastFrameTimeRef.current = performance.now();

    // rAF loop at ~60fps
    const FRAME_MS = 1000 / 60;
    const loop = (now) => {
      if (!isPausedRef.current) {
        const delta = now - lastFrameTimeRef.current;
        if (delta >= FRAME_MS) {
          lastFrameTimeRef.current = now - (delta % FRAME_MS);
          moveFnRef.current?.();
          gameLoopFnRef.current?.();
        }
      } else {
        lastFrameTimeRef.current = now; // reset so no delta burst on resume
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const spawnLoop = () => {
      if (!isPausedRef.current) {
        spawnFnRef.current?.();
      }
    };
    itemSpawnRef.current = setInterval(spawnLoop, spawnInterval);

    // ---- Countdown timer --------------------------------------------------
    // Implemented as a self-rescheduling setTimeout (not setInterval) so the
    // tick rate can change between ticks. While slow_time is active we tick
    // every 1818ms instead of 1000ms -- the inverse of the 0.45x movement
    // multiplier, so subjective game time slows down to match the visual
    // slowdown of obstacles and dirty drops. Without this, slow_time felt
    // like a "more time" power-up because nothing was happening on screen
    // while the clock kept counting at full speed.
    const SLOW_TICK_MS   = 1818;  // ~ 1000 / 0.55, matches obstacle slowdown
    const NORMAL_TICK_MS = 1000;
    const tickClock = () => {
      if (isPausedRef.current) {
        // Re-check shortly without decrementing while paused.
        timerRef.current = setTimeout(tickClock, 200);
        return;
      }
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = null;
          cancelAnimationFrame(rafRef.current);
          clearInterval(itemSpawnRef.current);
          setScreen('gameover');
          return 0;
        }
        // Schedule the NEXT tick based on the live slow_time status. We read
        // activePowerUpsRef directly so this picks up the change the moment
        // slow_time activates or expires.
        const pups = activePowerUpsRef.current;
        const slowActive = pups.slow_time && pups.slow_time > Date.now();
        const nextDelay = slowActive ? SLOW_TICK_MS : NORMAL_TICK_MS;
        timerRef.current = setTimeout(tickClock, nextDelay);
        return prev - 1;
      });
    };
    timerRef.current = setTimeout(tickClock, NORMAL_TICK_MS);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(rafRef.current);
      clearInterval(itemSpawnRef.current);
      clearTimeout(timerRef.current);
    };
  }, [screen, countingDown, currentLevel]);

  // Score breakdown state (set when game ends)
  const [scoreBreakdown, setScoreBreakdown] = useState(null);

  // Save result when game ends (only once per screen transition to gameover)
  const gameSavedRef = useRef(false);
  useEffect(() => {
    if (screen === 'gameover' && !gameSavedRef.current) {
      gameSavedRef.current = true;
      audio.stopBackgroundMusic();
      audio.stopRain();

      const baseScore = score;
      let timeBonus = 0;
      let accuracyBonus = 0;
      const spawned = cleanDropsSpawnedRef.current;
      const caught = cleanDropsCaughtRef.current;
      const catchRate = spawned > 0 ? caught / spawned : 0;

      if (win) {
        timeBonus = timeLeft * 5;
        if (catchRate >= 0.9) {
          accuracyBonus = Math.round(500 + (catchRate - 0.9) / 0.1 * 500);
        }
      }

      const finalScore = baseScore + timeBonus + accuracyBonus;
      setScoreBreakdown({ baseScore, timeBonus, accuracyBonus, spawned, caught, catchRate, finalScore });

      // Optimistically update local star/score map so the carousel reflects
      // the result the instant the player returns -- works even offline.
      const earnedStars = computeStars(finalScore, catchRate, win);
      recordLocalLevel(currentLevel, earnedStars, finalScore, win, catchRate);

      // Persist (best-effort -- handles its own offline fallback)
      Promise.resolve(updateProgress(currentLevel, finalScore, win, catchRate))
        .then(() => { refreshLevelScores?.(); })
        .catch(() => {});

      if (!win) spendCup();
    }
  }, [screen, audio]);

  const handleManualSpill = useCallback(() => {
    if (screen !== 'playing' || fillAmount === 0) return;
    spillCup(true);
    addEffect(cupX + CUP_WIDTH / 2, GAME_HEIGHT - CUP_HEIGHT - 40, 'spill', '-8s ⏱️');
  }, [screen, fillAmount, spillCup, addEffect, cupX]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Use cup theme background during gameplay, standard background elsewhere
  const bgStyle = screen === 'playing'
    ? { background: `linear-gradient(180deg, ${cupTheme.skyTop} 0%, ${cupTheme.skyMid} 60%, ${cupTheme.skyBot} 100%)`, overflow: 'hidden' }
    : {};

  // Screen transition variants — slide left/right for lateral nav, slide up for gameplay
  const screenVariants = {
    levelselect: {
      initial: { opacity: 0, x: -24 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -24 },
    },
    customize: {
      initial: { opacity: 0, x: 24 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 24 },
    },
    playing: {
      initial: { opacity: 0, y: 32, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 16, scale: 0.98 },
    },
    gameover: {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -16 },
    },
  };

  const getVariant = (s) => screenVariants[s] || screenVariants.levelselect;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={bgStyle}>
      <AnimatePresence mode="wait">
        {screen === 'levelselect' && (
          <motion.div
            key="levelselect"
            {...getVariant('levelselect')}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full pb-16"
            style={{ maxHeight: '100dvh', overflowY: 'auto' }}
          >
            <LevelCarousel
              profile={profile}
              levelData={levelData}
              nextRefillIn={nextRefillIn}
              onPlay={startGame}
              onShowCustomizer={() => setScreen('customize')}
              onWatchAd={() => setShowAdModal(true)}
              onReload={reload}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
            />
            <BottomNav />
          </motion.div>
        )}

        {screen === 'customize' && (
          <motion.div
            key="customize"
            {...getVariant('customize')}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full pb-16 overflow-y-auto"
            style={{ maxHeight: '100dvh' }}
          >
            <NavigationHeader onBack={() => setScreen('levelselect')} />
            <CupCustomizer
              profile={profile}
              onSelect={(skinId) => setSkin(skinId)}
              onClose={() => setScreen('levelselect')}
            />
            <BottomNav />
          </motion.div>
        )}

        {screen === 'gameover' && (
          <GameOverScreen
            key="gameover"
            score={score}
            win={win}
            purity={purity}
            fill={fillAmount}
            level={currentLevel}
            scoreBreakdown={scoreBreakdown}
            previousHighestLevel={previousHighestLevel}
            onRestart={() => setScreen('levelselect')}
            onSkinApply={(skinId) => setSkin(skinId)}
          />
        )}

        {screen === 'playing' && (
          <motion.div
            key="playing"
            {...getVariant('playing')}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col items-center gap-3"
          >
            {/* Top bar: HUD + exit */}
            <div className="w-full max-w-[480px] flex items-start gap-2">
              <div className="flex-1">
                <GameHUD
                  timeLeft={timeLeft}
                  score={score}
                  purity={purity}
                  fillAmount={fillAmount}
                  fillGoal={levelConfig.fillGoal}
                  level={currentLevel}
                  levelLabel={levelConfig.label}
                  onSpill={handleManualSpill}
                  combo={combo}
                  activePowerUps={activePowerUps}
                  spillsUsed={spillsUsed}
                />
              </div>
              <div className="flex flex-col gap-1 mt-1 flex-shrink-0">
                <button
                  onClick={() => { setIsPaused(p => !p); }}
                  aria-label={isPaused ? 'Resume game' : 'Pause game'}
                  className="bg-card/80 border border-border/50 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/50 active:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isPaused
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  }
                </button>
                <button
                  onClick={exitGame}
                  aria-label="Exit level"
                  className="bg-card/80 border border-border/50 rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/50 active:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Canvas with countdown/pause overlay */}
            <div className="relative">
              <GameCanvas
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                items={items}
                cupX={cupX}
                cupWidth={CUP_WIDTH}
                cupHeight={CUP_HEIGHT}
                fillAmount={fillAmount}
                fillGoal={levelConfig.fillGoal}
                purity={purity}
                effects={effects}
                isShaking={isShaking}
                onTouchMove={handleTouchMove}
                onMouseMove={handleMouseMove}
                onUserGesture={handleUserGesture}
                cupSkin={cupSkin}
                theme={cupTheme}
              />
              {countingDown && (
                <Countdown onDone={() => setCountingDown(false)} />
              )}
              <AnimatePresence>
                {isPaused && !countingDown && (
                  <PauseOverlay
                    onResume={() => setIsPaused(false)}
                    onExit={exitGame}
                  />
                )}
              </AnimatePresence>
            </div>
            <p className="text-muted-foreground text-xs font-pixel" aria-live="polite">← → or A/D to move • Tap to drag</p>
          </motion.div>
        )}
      </AnimatePresence>

      {showAdModal && (
        <AdModal
          onEarn={async () => {
            // Close modal IMMEDIATELY so rapid taps can't trigger another
            // claim. Then process the reward off the UI thread.
            setShowAdModal(false);
            try { await addCup(1); }
            catch (err) { console.error('addCup after ad reward failed:', err); }
          }}
          onClose={() => setShowAdModal(false)}
        />
      )}
    </div>
  );
}