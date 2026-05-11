import { GAME_WIDTH, GAME_HEIGHT, DROP_TYPES, DIFFICULTY_TIERS, LEVEL_CONFIG, STAR_THRESHOLDS } from './constants';

export function createDrop(level) {
  const config = LEVEL_CONFIG[Math.min(level - 1, LEVEL_CONFIG.length - 1)];
  const tier = DIFFICULTY_TIERS[config.tier];
  const isPure = Math.random() > tier.contaminatedRatio;

  return {
    id: Math.random().toString(36).slice(2),
    x: Math.random() * (GAME_WIDTH - 30) + 15,
    y: -20,
    type: isPure ? DROP_TYPES.PURE : DROP_TYPES.CONTAMINATED,
    speed: tier.speed + (Math.random() * 1.5),
    radius: isPure ? 12 : 10,
  };
}

export function moveDrop(drop) {
  return { ...drop, y: drop.y + drop.speed };
}

export function isDropCaught(drop, cupX, cupWidth = 80) {
  const cupY = GAME_HEIGHT - 80;
  return (
    drop.y + drop.radius >= cupY &&
    drop.y - drop.radius <= cupY + 20 &&
    drop.x >= cupX - cupWidth / 2 &&
    drop.x <= cupX + cupWidth / 2
  );
}

export function isDropMissed(drop) {
  return drop.y > GAME_HEIGHT + 20;
}

export function calcStars(caught, total) {
  const accuracy = total > 0 ? caught / total : 0;
  if (accuracy >= STAR_THRESHOLDS[3]) return 3;
  if (accuracy >= STAR_THRESHOLDS[2]) return 2;
  if (accuracy >= STAR_THRESHOLDS[1]) return 1;
  return 0;
}

export function calcScore(caught, missed, timeLeft, level) {
  const basePoints = caught * 100;
  const penalty = missed * 30;
  const timeBonus = timeLeft * 10;
  const levelMultiplier = 1 + (level - 1) * 0.15;
  return Math.max(0, Math.round((basePoints - penalty + timeBonus) * levelMultiplier));
}

export function calcPurity(caught, total) {
  if (total === 0) return 100;
  return Math.round((caught / total) * 100);
}

export function getLevelConfig(level) {
  return LEVEL_CONFIG[Math.min(level - 1, LEVEL_CONFIG.length - 1)];
}

export function isLevelWon(caught, level) {
  const config = getLevelConfig(level);
  return caught >= config.target;
}
