import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialState = {
  // Auth
  userEmail: null,
  authToken: null,
  playerProfile: null,

  // PlayerProfile fields (mirrors Base44 entity)
  cups: 3,
  lastRefillTime: null,
  selectedCupSkin: 'default',
  highestLevel: 1,
  totalScore: 0,
  streak: 0,
  lastPlayDate: null,
  difficultyTier: 'EASY',
  hideFromLeaderboard: false,

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
};

const CUP_MAX = 5;
const CUP_REFILL_HOURS = 3;

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (email, token) => set({ userEmail: email, authToken: token }),

      setProfile: (profile) => set({
        cups: profile.cups ?? 3,
        lastRefillTime: profile.last_refill_time ?? null,
        selectedCupSkin: profile.selected_cup_skin ?? 'default',
        highestLevel: profile.highest_level ?? 1,
        totalScore: profile.total_score ?? 0,
        streak: profile.streak ?? 0,
        lastPlayDate: profile.last_play_date ?? null,
        difficultyTier: profile.difficulty_tier ?? 'EASY',
        hideFromLeaderboard: profile.hide_from_leaderboard ?? false,
        playerProfile: profile,
      }),

      // Refill cups based on time elapsed
      checkCupRefill: () => {
        const { cups, lastRefillTime } = get();
        if (cups >= CUP_MAX) return;
        const now = Date.now();
        const last = lastRefillTime ? new Date(lastRefillTime).getTime() : now;
        const hoursElapsed = (now - last) / (1000 * 60 * 60);
        const refills = Math.floor(hoursElapsed / CUP_REFILL_HOURS);
        if (refills > 0) {
          const newCups = Math.min(CUP_MAX, cups + refills);
          set({ cups: newCups, lastRefillTime: new Date().toISOString() });
        }
      },

      useCup: () => {
        const { cups } = get();
        if (cups <= 0) return false;
        set({ cups: cups - 1, lastRefillTime: cups === CUP_MAX ? new Date().toISOString() : get().lastRefillTime });
        return true;
      },

      setCupX: (x) => set({ cupX: x }),

      startGame: (level) => {
        const canPlay = get().useCup();
        if (!canPlay) return false;
        set({
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
          lastPlayDate: new Date().toISOString(),
        });
        return true;
      },

      pauseGame: () => set({ isPaused: true }),
      resumeGame: () => set({ isPaused: false }),

      setDrops: (drops) => set({ drops }),
      setTimeLeft: (timeLeft) => set({ timeLeft }),

      catchDrop: () => set((s) => ({
        caught: s.caught + 1,
        score: s.score + Math.round(100 * (1 + (s.currentLevel - 1) * 0.15)),
      })),

      missDrop: () => set((s) => ({
        missed: s.missed + 1,
      })),

      endGame: (result, finalScore, finalPurity, stars) => set((s) => {
        const won = result === 'win';
        const newHighest = won ? Math.max(s.highestLevel, s.currentLevel + 1) : s.highestLevel;
        // Auto-advance difficulty tier
        let tier = s.difficultyTier;
        if (newHighest >= 7) tier = 'STORM';
        else if (newHighest >= 5) tier = 'HARD';
        else if (newHighest >= 3) tier = 'MEDIUM';
        else tier = 'EASY';

        return {
          isPlaying: false,
          gameResult: result,
          score: finalScore,
          purity: finalPurity,
          highestLevel: newHighest,
          totalScore: s.totalScore + finalScore,
          streak: won ? s.streak + 1 : 0,
          difficultyTier: tier,
        };
      }),

      selectCupSkin: (skin) => set({ selectedCupSkin: skin }),
      setHideFromLeaderboard: (val) => set({ hideFromLeaderboard: val }),

      resetSession: () => set({
        drops: [],
        isPlaying: false,
        isPaused: false,
        gameResult: null,
      }),

      // Build a PlayerProfile object ready to save to Base44
      toProfileRecord: () => {
        const s = get();
        return {
          user_email: s.userEmail,
          cups: s.cups,
          last_refill_time: s.lastRefillTime,
          selected_cup_skin: s.selectedCupSkin,
          highest_level: s.highestLevel,
          total_score: s.totalScore,
          streak: s.streak,
          last_play_date: s.lastPlayDate,
          difficulty_tier: s.difficultyTier,
          hide_from_leaderboard: s.hideFromLeaderboard,
        };
      },
    }),
    {
      name: 'puredrop-store',
      partialize: (s) => ({
        userEmail: s.userEmail,
        cups: s.cups,
        lastRefillTime: s.lastRefillTime,
        selectedCupSkin: s.selectedCupSkin,
        highestLevel: s.highestLevel,
        totalScore: s.totalScore,
        streak: s.streak,
        lastPlayDate: s.lastPlayDate,
        difficultyTier: s.difficultyTier,
        hideFromLeaderboard: s.hideFromLeaderboard,
        currentLevel: s.currentLevel,
      }),
    }
  )
);
