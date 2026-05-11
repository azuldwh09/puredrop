import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { createDrop, moveDrop, isDropCaught, isDropMissed, calcScore, calcPurity, calcStars, isLevelWon, getLevelConfig } from '../game/gameEngine';
import { GAME_WIDTH, GAME_HEIGHT, DROP_TYPES, DIFFICULTY_TIERS, LEVEL_CONFIG } from '../game/constants';
import { saveLevelScore, savePlayerProfile } from '../api/offlineSync';

const CUP_WIDTH = 80;

export default function GameScreen({ onGameEnd }) {
  const {
    drops, setDrops, cupX, setCupX, caught, missed,
    catchDrop, missDrop, currentLevel, isPlaying, isPaused,
    timeLeft, setTimeLeft, endGame, authToken, userEmail,
    selectedCupSkin, score,
  } = useGameStore();

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const dropsRef = useRef([]);
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const cupXRef = useRef(cupX);
  const activeRef = useRef(false);

  const config = getLevelConfig(currentLevel);
  const tier = DIFFICULTY_TIERS[config.tier];

  const finishGame = useCallback((won) => {
    activeRef.current = false;
    clearInterval(spawnTimerRef.current);
    clearInterval(countdownRef.current);
    cancelAnimationFrame(animFrameRef.current);

    const total = caughtRef.current + missedRef.current;
    const finalScore = calcScore(caughtRef.current, missedRef.current, timeLeft, currentLevel);
    const finalPurity = calcPurity(caughtRef.current, total);
    const stars = calcStars(caughtRef.current, total);
    const result = won ? 'win' : 'lose';

    endGame(result, finalScore, finalPurity, stars);

    const scoreRecord = {
      user_email: userEmail,
      level: currentLevel,
      score: finalScore,
      purity: finalPurity,
      win: won,
      stars,
      accuracy: total > 0 ? caughtRef.current / total : 0,
    };

    saveLevelScore(scoreRecord, authToken);
    if (onGameEnd) onGameEnd(result, finalScore, finalPurity, stars);
  }, [currentLevel, timeLeft, endGame, authToken, userEmail, onGameEnd]);

  // Touch / mouse move for cup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const move = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = GAME_WIDTH / rect.width;
      const x = Math.max(CUP_WIDTH / 2, Math.min(GAME_WIDTH - CUP_WIDTH / 2, (clientX - rect.left) * scaleX));
      cupXRef.current = x;
      setCupX(x);
    };

    const onMouseMove = (e) => move(e.clientX);
    const onTouchMove = (e) => { e.preventDefault(); move(e.touches[0].clientX); };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [setCupX]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    activeRef.current = true;
    caughtRef.current = 0;
    missedRef.current = 0;
    dropsRef.current = [];

    // Spawn drops
    spawnTimerRef.current = setInterval(() => {
      if (!activeRef.current) return;
      dropsRef.current = [...dropsRef.current, createDrop(currentLevel)];
    }, tier.spawnRate);

    // Countdown timer
    let timeRemaining = config.timeLimit;
    setTimeLeft(timeRemaining);
    countdownRef.current = setInterval(() => {
      timeRemaining -= 1;
      setTimeLeft(timeRemaining);
      if (timeRemaining <= 0) {
        finishGame(isLevelWon(caughtRef.current, currentLevel));
      }
    }, 1000);

    // Render loop
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!activeRef.current) return;

      // Move drops
      dropsRef.current = dropsRef.current
        .map(moveDrop)
        .filter(drop => {
          if (isDropCaught(drop, cupXRef.current, CUP_WIDTH)) {
            if (drop.type === DROP_TYPES.PURE) {
              caughtRef.current += 1;
              catchDrop();
              if (isLevelWon(caughtRef.current, currentLevel)) finishGame(true);
            } else {
              missedRef.current += 1;
              missDrop();
            }
            return false;
          }
          if (isDropMissed(drop)) {
            if (drop.type === DROP_TYPES.PURE) {
              missedRef.current += 1;
              missDrop();
            }
            return false;
          }
          return true;
        });

      // Draw
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      skyGrad.addColorStop(0, '#0a1628');
      skyGrad.addColorStop(1, '#1a3a5c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Drops
      dropsRef.current.forEach(drop => {
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.fillStyle = drop.type === DROP_TYPES.PURE
          ? 'rgba(79, 195, 247, 0.9)'
          : 'rgba(139, 0, 0, 0.85)';
        ctx.shadowColor = drop.type === DROP_TYPES.PURE ? '#4fc3f7' : '#8b0000';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Cup
      const cupY = GAME_HEIGHT - 80;
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.moveTo(cupXRef.current - CUP_WIDTH / 2, cupY);
      ctx.lineTo(cupXRef.current + CUP_WIDTH / 2, cupY);
      ctx.lineTo(cupXRef.current + CUP_WIDTH / 2 - 8, cupY + 35);
      ctx.lineTo(cupXRef.current - CUP_WIDTH / 2 + 8, cupY + 35);
      ctx.closePath();
      ctx.fillStyle = 'rgba(79,195,247,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Level ${currentLevel}`, 12, 28);
      ctx.fillText(`⏱ ${timeRemaining}s`, GAME_WIDTH / 2 - 25, 28);
      ctx.fillText(`💧 ${caughtRef.current}/${config.target}`, GAME_WIDTH - 90, 28);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      activeRef.current = false;
      clearInterval(spawnTimerRef.current);
      clearInterval(countdownRef.current);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      style={{ width: '100%', maxWidth: GAME_WIDTH, touchAction: 'none', borderRadius: 16, display: 'block', margin: '0 auto' }}
    />
  );
}
