import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type { Habit, QuitterItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore } from './useConfigStore';
import { useEconomyStore } from './useEconomyStore';

// OFUSCAÇÃO
const obfuscatedStorage: StateStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try { JSON.parse(str); return str; } catch { try { return decodeURIComponent(atob(str)); } catch { return null; } }
  },
  setItem: (name, value) => { localStorage.setItem(name, btoa(encodeURIComponent(value))); },
  removeItem: (name) => localStorage.removeItem(name),
};

interface HabitState {
  habits: Habit[];
  logs: Record<string, Record<string, number>>;
  modifiers: Record<string, Record<string, 'freeze' | 'dayOff'>>;
  
  quitterItems: QuitterItem[];

  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updated: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  setLog: (habitId: string, date: string, count: number) => void;
  
  applyModifier: (habitId: string, date: string, type: 'freeze' | 'dayOff') => void;
  applyGlobalDayOff: (date: string) => void;

  addQuitterItem: (title: string) => void;
  updateQuitterItem: (id: string, updated: Partial<QuitterItem>) => void;
  deleteQuitterItem: (id: string) => void;
  relapseQuitter: (id: string) => void;
  checkinQuitter: (id: string, dateStr: string) => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      habits: [],
      logs: {},
      modifiers: {},
      quitterItems: [],

      addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
      updateHabit: (id, updated) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updated, updatedAt: Date.now() } : h)
      })),
      deleteHabit: (id) => set((state) => {
        const newLogs = { ...state.logs };
        const newMods = { ...state.modifiers };
        delete newLogs[id];
        delete newMods[id];
        useConfigStore.getState().addTombstone(id);
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
      }),

      addQuitterItem: (title) => set((state) => ({
          quitterItems: [...state.quitterItems, { id: uuidv4(), title, createdAt: Date.now(), lastRelapseAt: Date.now(), checkins: [], rewardCycle: 0, updatedAt: Date.now() }]
      })),
      updateQuitterItem: (id, updated) => set((state) => ({
          quitterItems: state.quitterItems.map(q => q.id === id ? { ...q, ...updated, updatedAt: Date.now() } : q)
      })),
      
      deleteQuitterItem: (id) => {
          useConfigStore.getState().addTombstone(id);
          const econ = useEconomyStore.getState();
          const currentLevelBaseXp = Math.pow(econ.level - 1, 2) * 100;
          useEconomyStore.setState({
              xp: currentLevelBaseXp,
              gold: 0,
              updatedAt: Date.now()
          });
          set((state) => ({ quitterItems: state.quitterItems.filter(q => q.id !== id) }));
      },
      
      relapseQuitter: (id) => set((state) => {
          const econ = useEconomyStore.getState();
          const currentLevelBaseXp = Math.pow(econ.level - 1, 2) * 100;
          const currentLevelProgressXp = econ.xp - currentLevelBaseXp;
          
          const newProgressXp = Math.max(0, Math.floor(currentLevelProgressXp * 0.5));
          const newGold = Math.max(0, Math.floor(econ.gold * 0.5));
          
          useEconomyStore.setState({
              xp: currentLevelBaseXp + newProgressXp,
              gold: newGold,
              updatedAt: Date.now()
          });
          
          return {
              quitterItems: state.quitterItems.map(q => q.id === id ? { ...q, lastRelapseAt: Date.now(), rewardCycle: 0, updatedAt: Date.now() } : q)
          };
      }),
      
      checkinQuitter: (id, dateStr) => set((state) => ({
          quitterItems: state.quitterItems.map(q => {
              if (q.id === id && !q.checkins.includes(dateStr)) {
                  const nextCycle = q.rewardCycle >= 7 ? 1 : q.rewardCycle + 1;
                  return { ...q, checkins: [...q.checkins, dateStr], rewardCycle: nextCycle, updatedAt: Date.now() };
              }
              return q;
          })
      }))
    }),
    { name: 'lida-habits-v5', storage: createJSONStorage(() => obfuscatedStorage) }
  )
);