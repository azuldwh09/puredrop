// Power-up definitions — unlocked at specific combo thresholds
export const POWER_UPS = {
  slow_time: {
    id: 'slow_time',
    emoji: '🐢',
    label: 'Slow Time',
    description: 'Obstacles & dirty drops slow to half speed and spawn less for 10s',
    comboRequired: 3,
    duration: 10000,
  },
  attract: {
    id: 'attract',
    emoji: '🧲',
    label: 'Attract',
    description: 'Drops magnetically drift toward your cup for 5s',
    comboRequired: 4,
    duration: 5000,
  },
  blaster: {
    id: 'blaster',
    emoji: '💥',
    label: 'Blaster',
    description: 'Destroys all rocks & balls on screen instantly',
    comboRequired: 5,
    duration: 0, // instant
  },
  cat_toy: {
    id: 'cat_toy',
    emoji: '🪀',
    label: 'Cat Toy',
    description: 'Cats are distracted and exit the screen for 6s',
    comboRequired: 6,
    duration: 6000,
  },
  fast_time: {
    id: 'fast_time',
    emoji: '⚡',
    label: 'Fast Time',
    description: '+10 seconds added to the clock!',
    comboRequired: 7,
    duration: 0, // instant
  },
  downpour: {
    id: 'downpour',
    emoji: '🌊',
    label: 'Downpour',
    description: 'Torrential clean rain, no obstacles, for 8s (doesn\'t affect accuracy)',
    comboRequired: 8,
    duration: 8000,
  },
};

// Returns array of power-ups available at the given combo level
export function getAvailablePowerUps(combo) {
  return Object.values(POWER_UPS).filter(p => combo >= p.comboRequired);
}