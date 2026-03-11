import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  currentLevel: number;
  completedLevels: number[];
  totalXP: number;
  badges: string[];
  terminalHistory: string[];
  newBadge: string | null;
  completeLevel: (id: number) => void;
  unlockLevel: (id: number) => void;
  awardBadge: (name: string) => void;
  addXP: (amount: number) => void;
  addTerminalEntry: (entry: string) => void;
  clearTerminal: () => void;
  clearNewBadge: () => void;
  resetProgress: () => void;
}

const BADGE_CONDITIONS: Record<number, string> = {
  5: '🐳 First Container',
  8: '🔨 Docker Builder',
  9: '💾 Volume Master',
  10: '🌐 Networking Pro',
  15: '🏆 Docker Master',
};

export const getRank = (xp: number) => {
  if (xp >= 1401) return { title: 'Docker Master', emoji: '🏆' };
  if (xp >= 1101) return { title: 'Docker Pro', emoji: '🚀' };
  if (xp >= 701) return { title: 'Docker Engineer', emoji: '⚙️' };
  if (xp >= 301) return { title: 'Docker Developer', emoji: '💻' };
  return { title: 'Docker Beginner', emoji: '🐣' };
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentLevel: 1,
      completedLevels: [],
      totalXP: 0,
      badges: [],
      terminalHistory: [],
      newBadge: null,

      completeLevel: (id: number) => {
        const state = get();
        if (state.completedLevels.includes(id)) return;
        const newCompleted = [...state.completedLevels, id];
        const newXP = state.totalXP + 100;
        const badge = BADGE_CONDITIONS[id];
        const newBadges = badge && !state.badges.includes(badge)
          ? [...state.badges, badge] : state.badges;
        const newBadge = badge && !state.badges.includes(badge) ? badge : null;
        set({
          completedLevels: newCompleted,
          totalXP: newXP,
          badges: newBadges,
          newBadge,
          currentLevel: Math.max(state.currentLevel, id + 1),
        });
      },

      unlockLevel: (id: number) => {
        set({ currentLevel: Math.max(get().currentLevel, id) });
      },

      awardBadge: (name: string) => {
        const state = get();
        if (!state.badges.includes(name)) {
          set({ badges: [...state.badges, name], newBadge: name });
        }
      },

      addXP: (amount: number) => set({ totalXP: get().totalXP + amount }),

      addTerminalEntry: (entry: string) => {
        set({ terminalHistory: [...get().terminalHistory, entry] });
      },

      clearTerminal: () => set({ terminalHistory: [] }),
      clearNewBadge: () => set({ newBadge: null }),

      resetProgress: () => set({
        currentLevel: 1,
        completedLevels: [],
        totalXP: 0,
        badges: [],
        terminalHistory: [],
        newBadge: null,
      }),
    }),
    { name: 'docker-quest-save' }
  )
);
