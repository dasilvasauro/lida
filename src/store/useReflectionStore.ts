import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Reflection } from '../types';
import { useConfigStore } from './useConfigStore';

interface ReflectionState {
  reflections: Reflection[];
  addReflection: (reflection: Reflection) => void;
  updateReflection: (id: string, updated: Partial<Reflection>) => void;
  deleteReflection: (id: string) => void;
}

export const useReflectionStore = create<ReflectionState>()(
  persist(
    (set) => ({
      reflections: [],
      addReflection: (r) => set((state) => ({ reflections: [{...r, updatedAt: Date.now()}, ...state.reflections] })),
      updateReflection: (id, updated) => set((state) => ({
        reflections: state.reflections.map((r) => r.id === id ? { ...r, ...updated, updatedAt: Date.now() } : r)
      })),
      deleteReflection: (id) => {
        useConfigStore.getState().addTombstone(id);
        set((state) => ({ reflections: state.reflections.filter((r) => r.id !== id) }));
      }
    }),
    { name: 'lida-reflections' }
  )
);