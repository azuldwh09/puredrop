// =============================================================================
// POWER-UPS -- src/lib/powerUps.js
// =============================================================================
// Defines every power-up available in the game.
//
// Power-ups are earned in-game by building a catch combo (consecutive clean
// drops without missing). When a player's combo reaches the required threshold,
// a power-up item begins spawning on the game canvas. Catching it activates
// the effect for its duration.
//
// Fields:
//   id            -- unique identifier used throughout the game engine
//   emoji         -- displayed on the falling power-up item and the HUD
//   label         -- short display name
//   description   -- full description shown in the tutorial / HUD tooltip
//   comboRequired -- catch combo count needed before this power-up starts spawning
//   duration      -- how long the effect lasts in milliseconds (0 = instant/one-shot)
// =============================================================================

export const POWER_UPS = {

  // Slows ALL obstacles and dirty drops to half speed for 10 seconds.
  // Also suppresses ~55% of obstacle/dirty spawn ticks to thin the field.
  // Activated at combo >= 3.
  slow_time: {
    id:           'slow_time',
    emoji:        '🐢',
    label:        'Slow Time',
    description:  'Obstacles & dirty drops slow to half speed for 10s',
    comboRequired: 3,
    duration:     10000,
  },

  // Clean drops drift horizontally toward the cup for 5 seconds.
  // Makes it much easier to catch drops without moving the cup.
  // Activated at combo >= 4.
  attract: {
    id:           'attract',
    emoji:        '🧲',
    label:        'Attract',
    description:  'Clean drops drift toward your cup for 5s',
    comboRequired: 4,
    duration:     5000,
  },

  // One-shot: destroys all current obstacles and dirty drops on screen.
  // Does not prevent new ones from spawning.
  // Activated at combo >= 5.
  blaster: {
    id:           'blaster',
    emoji:        '💥',
    label:        'Blaster',
    description:  'Destroys all obstacles currently on screen',
    comboRequired: 5,
    duration:     0, // instant effect
  },

  // Spawns a burst of clean drops for 8 seconds.
  // All drops during this period are clean (no dirty, fewer obstacles).
  // Activated at combo >= 6.
  downpour: {
    id:           'downpour',
    emoji:        '🌧️',
    label:        'Downpour',
    description:  'Only clean drops fall for 8s',
    comboRequired: 6,
    duration:     8000,
  },

  // Blocks cats from spawning for 12 seconds.
  // Useful on high tiers where cats are frequent and fast.
  // Activated at combo >= 7.
  cat_toy: {
    id:           'cat_toy',
    emoji:        '🐟',
    label:        'Cat Toy',
    description:  'Cats are distracted and stop appearing for 12s',
    comboRequired: 7,
    duration:     12000,
  },

  // Instantly fills the cup by 20 units (shown as a visual fill boost).
  // One-shot effect.
  // Activated at combo >= 8.
  fill_boost: {
    id:           'fill_boost',
    emoji:        '💧',
    label:        'Fill Boost',
    description:  'Instantly adds 20 units to your cup fill',
    comboRequired: 8,
    duration:     0, // instant
  },

};
