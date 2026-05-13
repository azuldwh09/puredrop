// =============================================================================
// SOUND SETTINGS HOOK -- src/hooks/useSoundSettings.js
// =============================================================================
// Persists the player's sound-enabled preference to localStorage and provides
// a toggle function. Used by the Settings modal and passed down to useGameAudio.
//
// Default: sound ON (true).
// =============================================================================

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'puredrop_sound';

export function useSoundSettings() {
  // Initialize from localStorage so the preference survives app restarts
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true; // default ON if localStorage is unavailable
    }
  });

  // Persist every change to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(soundEnabled)); }
    catch {}
  }, [soundEnabled]);

  // Toggle between on and off
  const toggleSound = () => setSoundEnabled(prev => !prev);

  return { soundEnabled, toggleSound };
}
