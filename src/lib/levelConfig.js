// Returns game config for a given level (1-indexed), supports up to 500+ levels
export function getLevelConfig(level) {
  const l = Math.max(1, level);

  // --- Difficulty tier (1–6) drives non-linear jumps ---
  const tier = getTier(l);

  // Speed: starts gentle, ramps sharply at higher tiers
  // Each tier adds a multiplier on top of base progression
  const tierSpeedBonus = [0, 0, 1.2, 2.8, 4.8, 7.2, 10.0][tier];
  const linearSpeed    = Math.min(4, (l - 1) * 0.04);
  const speedBonus     = linearSpeed + tierSpeedBonus;

  // Spawn interval: starts at 900ms, floors at 160ms (tier 6)
  const tierSpawnFloor = [900, 750, 580, 420, 300, 220, 160][tier];
  const spawnReduction = Math.min(tierSpawnFloor - 160, (l - 1) * 0.9);
  const spawnInterval  = Math.max(tierSpawnFloor - spawnReduction, 160);

  // Clean chance: drops faster at higher tiers
  const tierCleanStart = [0.65, 0.62, 0.55, 0.45, 0.36, 0.28, 0.20][tier];
  const cleanChance    = Math.max(0.15, tierCleanStart - (l - 1) * 0.0006);

  // Dirty chance: rises faster at higher tiers
  const tierDirtyStart = [0.10, 0.12, 0.16, 0.22, 0.28, 0.34, 0.40][tier];
  const dirtyChance    = Math.min(0.45, tierDirtyStart + (l - 1) * 0.0004);

  // Duration: starts 90s, floors at 20s
  const tierDurationMin = [90, 80, 65, 50, 38, 28, 20][tier];
  const gameDuration    = Math.max(tierDurationMin, 90 - (l - 1) * 0.14);

  // Fill goal: increases with tier (harder to fill)
  const fillGoal = Math.min(160, 100 + (tier - 1) * 12);

  // Purity goal: rises with tier (must keep water cleaner)
  const purityGoal = Math.min(90, 60 + tier * 5);

  // Cup speed bonus: faster cup movement needed at high tiers (used in Game.jsx constant)
  const cupSpeedBonus = [0, 0, 0, 1, 2, 3, 4][tier];

  return {
    level: l,
    tier,
    gameDuration:     Math.round(gameDuration),
    dropSpeedMin:     3   + speedBonus,
    dropSpeedMax:     6   + speedBonus,
    obstacleSpeedMin: 2.5 + speedBonus * 0.6,
    obstacleSpeedMax: 5.0 + speedBonus * 0.8,
    spawnInterval:    Math.round(spawnInterval),
    cleanChance,
    dirtyChance,
    fillGoal,
    purityGoal,
    cupSpeedBonus,
    label:       getLevelLabel(l),
    description: getLevelDescription(l, tier),
    theme:       getLevelTheme(tier),
  };
}

// Tier breakpoints: 1=Drizzle … 6=Apocalypse
function getTier(l) {
  if (l <= 10)  return 1;
  if (l <= 30)  return 2;
  if (l <= 70)  return 3;
  if (l <= 130) return 4;
  if (l <= 220) return 5;
  if (l <= 350) return 6;
  return 6; // tier 6 caps at 350+
}

function getLevelLabel(l) {
  if (l <= 10)  return 'Drizzle';
  if (l <= 30)  return 'Shower';
  if (l <= 70)  return 'Downpour';
  if (l <= 130) return 'Thunderstorm';
  if (l <= 220) return 'Monsoon';
  if (l <= 350) return 'Hurricane';
  return 'Apocalypse';
}

// Each tier gets a distinct visual theme for the game canvas
export function getLevelTheme(tier) {
  const themes = {
    1: {
      tier: 1,
      skyTop: '#87ceeb', skyMid: '#b0e0ff', skyBot: '#d4f0ff',
      groundTop: '#4caf50', groundBot: '#2e7d32',
      grassColor: '#81c784',
      rainColor: 'rgba(100,180,255,0.35)',
      cloudAlpha: 0.55,
      envEmoji: '🌤️',
    },
    2: {
      tier: 2,
      skyTop: '#546e8a', skyMid: '#78909c', skyBot: '#90a4ae',
      groundTop: '#388e3c', groundBot: '#1b5e20',
      grassColor: '#66bb6a',
      rainColor: 'rgba(140,200,240,0.35)',
      cloudAlpha: 0.75,
      envEmoji: '⛅',
    },
    3: {
      tier: 3,
      skyTop: '#1b2838', skyMid: '#263045', skyBot: '#2e3f5c',
      groundTop: '#2e7d32', groundBot: '#1a3a1a',
      grassColor: '#43a047',
      rainColor: 'rgba(120,190,230,0.45)',
      cloudAlpha: 0.85,
      envEmoji: '🌧️',
    },
    4: {
      tier: 4,
      skyTop: '#1a0535', skyMid: '#2d1060', skyBot: '#3a1880',
      groundTop: '#1b5e20', groundBot: '#0d2e0d',
      grassColor: '#2e7d32',
      rainColor: 'rgba(180,140,255,0.4)',
      cloudAlpha: 0.9,
      envEmoji: '⛈️',
    },
    5: {
      tier: 5,
      skyTop: '#003040', skyMid: '#004d60', skyBot: '#006070',
      groundTop: '#e0c97f', groundBot: '#b5922a',
      grassColor: '#c8b860',
      rainColor: 'rgba(100,220,220,0.45)',
      cloudAlpha: 0.9,
      envEmoji: '🌊',
    },
    6: {
      tier: 6,
      skyTop: '#0a0a0a', skyMid: '#111520', skyBot: '#1a1f30',
      groundTop: '#37474f', groundBot: '#1c2429',
      grassColor: '#546e7a',
      rainColor: 'rgba(160,200,255,0.55)',
      cloudAlpha: 0.95,
      envEmoji: '🌀',
    },
  };
  return themes[tier] || themes[1];
}

function getLevelDescription(l, tier) {
  const descs = [
    'Light rain, easy pace.',
    'Picking up speed.',
    'More obstacles, faster drops.',
    'Fast drops, less time, higher purity needed.',
    'Chaos reigns — stay sharp!',
    'Pure madness. Fill more, stay cleaner.',
    'Maximum difficulty. Good luck.',
  ];
  return descs[tier] || descs[descs.length - 1];
}