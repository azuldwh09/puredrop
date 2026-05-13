// =============================================================================
// LEVEL CONFIGURATION -- src/lib/levelConfig.js
// =============================================================================
// Generates the game configuration for any level (1 -> 500+).
//
// Instead of hardcoding values for every level, we use formulas that produce
// a smooth but non-linear difficulty curve across 6 tiers:
//
//   Tier 1: Drizzle      (levels 1-10)   -- Easy intro
//   Tier 2: Shower       (levels 11-30)  -- Picks up speed
//   Tier 3: Downpour     (levels 31-70)  -- More obstacles
//   Tier 4: Thunderstorm (levels 71-130) -- Fast and less time
//   Tier 5: Monsoon      (levels 131-220)-- Chaos
//   Tier 6: Hurricane    (levels 221-350+)-- Maximum difficulty
//
// Each tier changes the BASE values for speed, spawn rate, drop ratio, and
// duration. The formulas then apply linear progression ON TOP of the tier
// base, so difficulty ramps continuously within each tier and jumps
// noticeably when crossing tier boundaries.
//
// getLevelConfig() is the only public export. Everything else is internal.
// =============================================================================

// =============================================================================
// getLevelConfig
// =============================================================================
// Returns a config object for the given level (1-indexed).
// All values are already calculated -- callers use them directly.
//
// Returned shape:
//   level            -- the level number
//   tier             -- difficulty tier (1-6)
//   gameDuration     -- total game time in seconds
//   dropSpeedMin/Max -- vertical fall speed range for clean/dirty drops
//   obstacleSpeedMin/Max -- fall speed range for rocks/balls/cats
//   spawnInterval    -- ms between item spawns
//   cleanChance      -- probability (0-1) a spawn is a clean drop
//   dirtyChance      -- probability (0-1) a spawn is a dirty drop
//   fillGoal         -- how many units to fill the cup to win
//   purityGoal       -- minimum purity percentage to win
//   cupSpeedBonus    -- extra pixels/frame added to cup movement speed
//   label            -- tier name string (e.g. "Thunderstorm")
//   description      -- short difficulty description for level select
//   theme            -- visual theme object (sky colors, rain color, etc.)
export function getLevelConfig(level) {
  const l    = Math.max(1, level);
  const tier = getTier(l);

  // -- Drop fall speed -------------------------------------------------------
  // Linear ramp within tier + tier-specific jump at boundary
  const tierSpeedBonus = [0, 0, 1.2, 2.8, 4.8, 7.2, 10.0][tier];
  const linearSpeed    = Math.min(4, (l - 1) * 0.04);
  const speedBonus     = linearSpeed + tierSpeedBonus;

  // -- Spawn interval (ms between items) ------------------------------------
  // Floors at 160ms so spawns never exceed engine capacity
  const tierSpawnFloor = [900, 750, 580, 420, 300, 220, 160][tier];
  const spawnReduction = Math.min(tierSpawnFloor - 160, (l - 1) * 0.9);
  const spawnInterval  = Math.max(tierSpawnFloor - spawnReduction, 160);

  // -- Clean drop chance -----------------------------------------------------
  // Starts high (easy to catch) and decreases with level
  const tierCleanStart = [0.65, 0.62, 0.55, 0.45, 0.36, 0.28, 0.20][tier];
  const cleanChance    = Math.max(0.15, tierCleanStart - (l - 1) * 0.0006);

  // -- Dirty drop chance -----------------------------------------------------
  // Rises slowly -- above cleanChance + dirtyChance = obstacle zone
  const tierDirtyStart = [0.10, 0.12, 0.16, 0.22, 0.28, 0.34, 0.40][tier];
  const dirtyChance    = Math.min(0.45, tierDirtyStart + (l - 1) * 0.0004);

  // -- Game duration (seconds) -----------------------------------------------
  // Shrinks over time but floors per tier so it never becomes impossibly short
  const tierDurationMin = [90, 80, 65, 50, 38, 28, 20][tier];
  const gameDuration    = Math.max(tierDurationMin, 90 - (l - 1) * 0.14);

  // -- Fill goal (units needed to win) --------------------------------------
  // Higher tiers require more cup fill, making it harder to win quickly
  const fillGoal = Math.min(160, 100 + (tier - 1) * 12);

  // -- Purity goal (minimum % purity) ---------------------------------------
  // Higher tiers penalize catching dirty drops more harshly
  const purityGoal = Math.min(90, 60 + tier * 5);

  // -- Cup speed bonus -------------------------------------------------------
  // Allows the cup to move faster at high tiers where drops fall faster
  const cupSpeedBonus = [0, 0, 0, 1, 2, 3, 4][tier];

  return {
    level:            l,
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

// =============================================================================
// getTier (internal)
// =============================================================================
// Maps a level number to a tier (1-6).
// Tier boundaries are designed so each tier has enough levels to feel distinct.
function getTier(l) {
  if (l <= 10)  return 1; // Drizzle
  if (l <= 30)  return 2; // Shower
  if (l <= 70)  return 3; // Downpour
  if (l <= 130) return 4; // Thunderstorm
  if (l <= 220) return 5; // Monsoon
  return 6;               // Hurricane (350+)
}

// =============================================================================
// getLevelLabel (internal)
// =============================================================================
// Human-readable tier name shown on the Level Select screen.
function getLevelLabel(l) {
  if (l <= 10)  return 'Drizzle';
  if (l <= 30)  return 'Shower';
  if (l <= 70)  return 'Downpour';
  if (l <= 130) return 'Thunderstorm';
  if (l <= 220) return 'Monsoon';
  if (l <= 350) return 'Hurricane';
  return 'Apocalypse';
}

// =============================================================================
// getLevelTheme (exported)
// =============================================================================
// Returns a visual theme object for a given tier.
// Used by GameCanvas to set sky gradients, rain color, ground color, and
// tier-specific decorations (flowers, trees, palm trees, etc.).
export function getLevelTheme(tier) {
  const themes = {
    // Tier 1: Sunny meadow
    1: {
      tier: 1,
      skyTop:     '#87ceeb', skyMid: '#b0e0ff', skyBot: '#d4f0ff',
      groundTop:  '#4caf50', groundBot: '#2e7d32',
      grassColor: '#81c784',
      rainColor:  'rgba(100,180,255,0.35)',
      cloudAlpha: 0.55,
      envEmoji:   '🌤️',
    },
    // Tier 2: Overcast
    2: {
      tier: 2,
      skyTop:     '#546e8a', skyMid: '#78909c', skyBot: '#90a4ae',
      groundTop:  '#388e3c', groundBot: '#1b5e20',
      grassColor: '#66bb6a',
      rainColor:  'rgba(140,200,240,0.35)',
      cloudAlpha: 0.75,
      envEmoji:   '⛅',
    },
    // Tier 3: Dark forest rain
    3: {
      tier: 3,
      skyTop:     '#1b2838', skyMid: '#263045', skyBot: '#2e3f5c',
      groundTop:  '#2e7d32', groundBot: '#1a3a1a',
      grassColor: '#43a047',
      rainColor:  'rgba(120,190,230,0.45)',
      cloudAlpha: 0.85,
      envEmoji:   '🌧️',
    },
    // Tier 4: Electric storm (purple sky)
    4: {
      tier: 4,
      skyTop:     '#1a0535', skyMid: '#2d1060', skyBot: '#3a1880',
      groundTop:  '#1b5e20', groundBot: '#0d2e0d',
      grassColor: '#2e7d32',
      rainColor:  'rgba(180,140,255,0.4)',
      cloudAlpha: 0.9,
      envEmoji:   '⛈️',
    },
    // Tier 5: Teal monsoon coast
    5: {
      tier: 5,
      skyTop:     '#003040', skyMid: '#004d60', skyBot: '#006070',
      groundTop:  '#e0c97f', groundBot: '#b5922a',
      grassColor: '#c8b860',
      rainColor:  'rgba(100,220,220,0.45)',
      cloudAlpha: 0.9,
      envEmoji:   '🌊',
    },
    // Tier 6: Apocalyptic hurricane (near-black)
    6: {
      tier: 6,
      skyTop:     '#0a0a0a', skyMid: '#111520', skyBot: '#1a1f30',
      groundTop:  '#37474f', groundBot: '#1c2429',
      grassColor: '#546e7a',
      rainColor:  'rgba(160,200,255,0.55)',
      cloudAlpha: 0.95,
      envEmoji:   '🌀',
    },
  };
  return themes[tier] || themes[1];
}

// =============================================================================
// getLevelDescription (internal)
// =============================================================================
// Short blurb shown under the level name on the Level Select screen.
function getLevelDescription(l, tier) {
  const descs = [
    'Light rain, easy pace.',
    'Picking up speed.',
    'More obstacles, faster drops.',
    'Fast drops, less time, higher purity needed.',
    'Chaos reigns -- stay sharp!',
    'Pure madness. Fill more, stay cleaner.',
    'Maximum difficulty. Good luck.',
  ];
  return descs[tier] || descs[descs.length - 1];
}
