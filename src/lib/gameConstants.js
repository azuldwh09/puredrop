export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;
export const CUP_WIDTH = 60;
export const CUP_HEIGHT = 50;
export const CUP_Y = GAME_HEIGHT - 70;
export const GAME_DURATION = 60; // seconds

export const DROP_TYPES = {
  PURE: { type: 'pure', color: '#38bdf8', emoji: '💧', radius: 8, speed: 3, weight: 3 },
  CONTAMINATED: { type: 'contaminated', color: '#a3e635', emoji: '🟢', radius: 8, speed: 2.5, weight: 2 },
};

export const OBSTACLE_TYPES = {
  ROCK: { type: 'rock', emoji: '🪨', width: 30, height: 28, speed: 2.5, damage: 'spill' },
  BALL: { type: 'ball', emoji: '⚽', width: 26, height: 26, speed: 3.5, damage: 'spill' },
  CAT: { type: 'cat', emoji: '🐱', width: 32, height: 30, speed: 2, damage: 'spill' },
};

export const SPAWN_RATES = {
  PURE_DROP: 0.04,
  CONTAMINATED_DROP: 0.015,
  OBSTACLE: 0.008,
};