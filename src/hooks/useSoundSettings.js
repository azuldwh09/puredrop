// Persists sound on/off preference in localStorage
import { useState, useCallback } from 'react';

const KEY = 'puredrop_sound_enabled';

export function useSoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(KEY);
    return stored === null ? true : stored === 'true';
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem(KEY, String(next));
      return next;
    });
  }, []);

  return { soundEnabled, toggleSound };
}