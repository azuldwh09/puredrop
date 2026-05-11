import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialState = {
  // Player
  userEmail: null,
  authToken: null,
  playerProfile: null,

  // Game session
  currentLevel: 1,
  score: 0,
  purity: 100,
  drops: [],
  cupX: 200,
  caught: 0,
  missed: 0,
  timeLeft: 60,
  isPlaying: false,
  isPaused: false,
  gameResult: null, // 'win' | 'lose' | null

  // Meta
  selectedCupSkin: 'default',
  cups: 3,
  streak: 0,
  highestLevel: 1,
  totalScore: 0,
};

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (email, token) => set({ userEmail: email, authToken: token }),
      setProfile: (profile) => set({ playerProfile: profile }),

      setCupX: (x) => set({ cupX: x }),

      startGame: (level) => set({
        currentLevel: level,
        score: 0,
        purity: 100,
        drops: [],
        cupX: 200,
        caught: 0,
        missed: 0,
        isPlaying: true,
        isPaused: false,
        gameResult: null,
      }),

      pauseGame: () => set({ isPaused: true }),
      resumeGame: () => set({ isPaused: false }),

      setDrops: (drops) => set({ drops }),
      setTimeLeft: (timeLeft) => set({ timeLeft }),

      catchDrop: () => set((s) => ({
        caught: s.caught + 1,
        score: s.score + (100 * (1 + (s.currentLevel - 1) * 0.15)),
      })),

      missDrop: () => set((s) => ({
        missed: s.missed + 1,
      })),

      endGame: (result, finalScore, finalPurity, stars) => set((s) => ({
        isPlaying: false,
        gameResult: result,
        score: finalScore,
        purity: finalPurity,
        highestLevel: result === 'win'
          ? Math.max(s.highestLevel, s.currentLevel + 1)
          : s.highestLevel,
        totalScore: s.totalScore + finalScore,
        streak: result === 'win' ? s.streak + 1 : 0,
      })),

      selectCupSkin: (skin) => set({ selectedCupSkin: skin }),

      resetSession: () => set({
        drops: [],
        isPlaying: false,
        isPaused: false,
        gameResult: null,
      }),
    }),
    {
      name: 'puredrop-store',
      partialize: (s) => ({
        currentLevel: s.currentLevel,
        selectedCupSkin: s.selectedCupSkin,
        cups: s.cups,
        streak: s.streak,
        highestLevel: s.highestLevel,
        totalScore: s.totalScore,
        userEmail: s.userEmail,
      }),
    }
  )
);
