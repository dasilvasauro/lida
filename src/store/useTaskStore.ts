import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Mood } from '../types';

interface TaskState {
  tasks: Task[];
  dailyMood: Mood | null;
  selectedFilter: 'today' | 'week' | 'month' | 'all';
  addTask: (task: Task) => void;
  toggleTaskCompletion: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  setDailyMood: (mood: Mood) => void;
  setFilter: (filter: 'today' | 'week' | 'month' | 'all') => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      dailyMood: null,
      selectedFilter: 'today',
      
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      
      toggleTaskCompletion: (taskId) => set((state) => ({
        tasks: state.tasks.map((t) => 
          t.id === taskId 
            ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? Date.now() : undefined } 
            : t
        )
      })),

      deleteTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId)
      })),

      setDailyMood: (dailyMood) => set({ dailyMood }),
      setFilter: (selectedFilter) => set({ selectedFilter }),
    }),
    { name: 'lida-tasks' }
  )
);