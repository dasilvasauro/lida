import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit } from '../types';

interface HabitState {
  habits: Habit[];
  logs: Record<string, Record<string, number>>;
  modifiers: Record<string, Record<string, 'freeze' | 'dayOff'>>; // Power-ups

  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updated: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  setLog: (habitId: string, date: string, count: number) => void;
  
  applyModifier: (habitId: string, date: string, type: 'freeze' | 'dayOff') => void;
  applyGlobalDayOff: (date: string) => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      habits: [],
      logs: {},
      modifiers: {},

      addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
      updateHabit: (id, updated) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updated } : h)
      })),
      deleteHabit: (id) => set((state) => {
        const newLogs = { ...state.logs };
        const newMods = { ...state.modifiers };
        delete newLogs[id];
        delete newMods[id];
        return { habits: state.habits.filter(h => h.id !== id), logs: newLogs, modifiers: newMods };
      }),
      setLog: (habitId, date, count) => set((state) => {
        const habitLogs = state.logs[habitId] || {};
        return {
          logs: { ...state.logs, [habitId]: { ...habitLogs, [date]: count } }
        };
      }),
      applyModifier: (habitId, date, type) => set((state) => {
        const habitMods = state.modifiers[habitId] || {};
        return {
          modifiers: { ...state.modifiers, [habitId]: { ...habitMods, [date]: type } }
        };
      }),
      applyGlobalDayOff: (date) => set((state) => {
        const newMods = { ...state.modifiers };
        state.habits.forEach(habit => {
          if (!newMods[habit.id]) newMods[habit.id] = {};
          newMods[habit.id][date] = 'dayOff';
        });
        return { modifiers: newMods };
      })
    }),
    { name: 'lida-habits-v5' }
  )
);