import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Mood, Folder } from '../types';
import { format } from 'date-fns';

interface TaskState {
  tasks: Task[];
  folders: Folder[];
  dailyMood: Mood | null;
  moodHistory: Record<string, Mood>; // <-- Novo: Histórico de Humor
  selectedFilter: 'today' | 'week' | 'month' | 'all';
  selectedFolderId: string;
  activeFocusSession: { taskId: string; startTime: number; duration: number } | null;
  isFocusModeOpen: boolean;
  isGlobalModalOpen: boolean;
  
  setGlobalModalOpen: (isOpen: boolean) => void;
  addTask: (task: Task) => void;
  toggleTaskCompletion: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  
  addFolder: (folder: Folder) => void;
  deleteFolder: (folderId: string) => void;
  setFolderId: (folderId: string) => void;

  setDailyMood: (mood: Mood) => void;
  setFilter: (filter: 'today' | 'week' | 'month' | 'all') => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;

  startFocus: (taskId: string, durationMinutes: number) => void;
  stopFocus: () => void;
  toggleFocusMode: (isOpen: boolean) => void;
  updateTask: (taskId: string, updatedTask: Partial<Task>) => void;
  markTaskFailed: (taskId: string) => void;
  clearCompletedTasks: () => void;
  applyPowerUp: (taskId: string, type: 'respite' | 'relief' | 'magicDice') => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      folders: [{ id: 'default', name: 'Geral' }],
      dailyMood: null,
      moodHistory: {},
      selectedFilter: 'today',
      selectedFolderId: 'all',
      activeFocusSession: null,
      isFocusModeOpen: false,
      isGlobalModalOpen: false,

      setGlobalModalOpen: (isOpen) => set({ isGlobalModalOpen: isOpen }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      
      toggleTaskCompletion: (taskId) => set((state) => {
        const isCompletingActive = state.activeFocusSession?.taskId === taskId;
        return {
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? Date.now() : undefined }
              : t
          ),
          ...(isCompletingActive ? { activeFocusSession: null, isFocusModeOpen: false } : {})
        };
      }),

      deleteTask: (taskId) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),

      addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
      setFolderId: (folderId) => set({ selectedFolderId: folderId }),
      deleteFolder: (folderId) => set((state) => ({
        folders: state.folders.filter(f => f.id !== folderId),
        tasks: state.tasks.map(t => t.folderId === folderId ? { ...t, folderId: 'default' } : t),
        selectedFolderId: state.selectedFolderId === folderId ? 'all' : state.selectedFolderId
      })),

      // Atualizado para salvar no histórico
      setDailyMood: (mood) => set((state) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return { 
          dailyMood: mood,
          moodHistory: { ...state.moodHistory, [todayStr]: mood }
        };
      }),
      
      setFilter: (selectedFilter) => set({ selectedFilter }),

      toggleSubtask: (taskId, subtaskId) => set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks?.map((st) => st.id === subtaskId ? { ...st, completed: !st.completed } : st) }
            : t
        )
      })),

      startFocus: (taskId, durationMinutes) => set((state) => {
        if (state.activeFocusSession?.taskId === taskId) return { isFocusModeOpen: true };
        return {
          activeFocusSession: { taskId, startTime: Date.now(), duration: durationMinutes * 60 },
          isFocusModeOpen: true
        };
      }),

      stopFocus: () => set({ activeFocusSession: null, isFocusModeOpen: false }),
      toggleFocusMode: (isOpen) => set({ isFocusModeOpen: isOpen }),
      updateTask: (taskId, updatedTask) => set((state) => ({ tasks: state.tasks.map((t) => t.id === taskId ? { ...t, ...updatedTask } : t) })),
      markTaskFailed: (taskId) => set((state) => ({ tasks: state.tasks.map((t) => t.id === taskId ? { ...t, isFailed: true } : t) })),
      clearCompletedTasks: () => set((state) => ({ tasks: state.tasks.filter((t) => !t.isCompleted) })),

      applyPowerUp: (taskId, type) => set((state) => ({
        tasks: state.tasks.map(t => {
          if (t.id !== taskId) return t;
          if (type === 'magicDice') return { ...t, hasMagicDice: true };
          if (type === 'respite') {
            let newTime = t.deadlineTime;
            if (newTime) {
              const [h, m] = newTime.split(':').map(Number);
              const newH = Math.min(23, h + 3);
              newTime = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }
            return { ...t, hasRespite: true, deadlineTime: newTime };
          }
          if (type === 'relief') {
            let newDate = t.deadlineDate;
            if (newDate) {
              const dateObj = new Date(newDate + 'T12:00:00');
              dateObj.setDate(dateObj.getDate() + 1);
              newDate = dateObj.toISOString().split('T')[0];
            }
            return { ...t, hasRelief: true, deadlineDate: newDate };
          }
          return t;
        })
      }))
    }),
    { name: 'lida-tasks' }
  )
);