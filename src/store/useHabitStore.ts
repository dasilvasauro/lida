import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit } from '../types';

interface HabitState {
    habits: Habit[];
    // Agora guardamos: habitId -> { 'YYYY-MM-DD': quantidadeFeita }
    logs: Record<string, Record<string, number>>;

    addHabit: (habit: Habit) => void;
    updateHabit: (id: string, updated: Partial<Habit>) => void;
    deleteHabit: (id: string) => void;
    setLog: (habitId: string, date: string, count: number) => void;
}

export const useHabitStore = create<HabitState>()(
    persist(
        (set) => ({
            habits: [],
            logs: {},
            addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
                  updateHabit: (id, updated) => set((state) => ({
                      habits: state.habits.map(h => h.id === id ? { ...h, ...updated } : h)
                  })),
                  deleteHabit: (id) => set((state) => {
                      const newLogs = { ...state.logs };
                      delete newLogs[id];
                      return { habits: state.habits.filter(h => h.id !== id), logs: newLogs };
                  }),
                  setLog: (habitId, date, count) => set((state) => {
                      const habitLogs = state.logs[habitId] || {};
                      return {
                          logs: {
                              ...state.logs,
                              [habitId]: {
                                  ...habitLogs,
                                  [date]: count
                              }
                          }
                      };
                  })
        }),
        { name: 'lida-habits-v2' } // <-- Trocado para v2 para limpar os dados antigos de teste e evitar crash
    )
);
