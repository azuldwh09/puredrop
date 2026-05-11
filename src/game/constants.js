export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const DROP_TYPES = {
  PURE: 'pure',
  CONTAMINATED: 'contaminated',
};

export const DIFFICULTY_TIERS = {
  EASY:   { speed: 2.5, spawnRate: 1200, contaminatedRatio: 0.25 },
  MEDIUM: { speed: 4.0, spawnRate: 900,  contaminatedRatio: 0.40 },
  HARD:   { speed: 5.5, spawnRate: 650,  contaminatedRatio: 0.55 },
  STORM:  { speed: 7.0, spawnRate: 450,  contaminatedRatio: 0.65 },
};

export const LEVEL_CONFIG = [
  { level: 1,  target: 10, tier: 'EASY',   timeLimit: 60 },
  { level: 2,  target: 15, tier: 'EASY',   timeLimit: 60 },
  { level: 3,  target: 20, tier: 'MEDIUM', timeLimit: 55 },
  { level: 4,  target: 25, tier: 'MEDIUM', timeLimit: 55 },
  { level: 5,  target: 30, tier: 'HARD',   timeLimit: 50 },
  { level: 6,  target: 35, tier: 'HARD',   timeLimit: 50 },
  { level: 7,  target: 40, tier: 'STORM',  timeLimit: 45 },
  { level: 8,  target: 50, tier: 'STORM',  timeLimit: 45 },
  { level: 9,  target: 60, tier: 'STORM',  timeLimit: 40 },
  { level: 10, target: 75, tier: 'STORM',  timeLimit: 40 },
];

export const CUP_SKINS = [
  { id: 'default',   label: 'Basic Cup',    color: '#4fc3f7', unlockLevel: 1  },
  { id: 'golden',    label: 'Golden Cup',   color: '#ffd700', unlockLevel: 3  },
  { id: 'crystal',   label: 'Crystal Cup',  color: '#e0f7fa', unlockLevel: 5  },
  { id: 'obsidian',  label: 'Obsidian Cup', color: '#37474f', unlockLevel: 7  },
  { id: 'rainbow',   label: 'Rainbow Cup',  color: 'rainbow', unlockLevel: 10 },
];

export const STAR_THRESHOLDS = { 3: 0.9, 2: 0.7, 1: 0.5 };
