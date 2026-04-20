import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Mood } from '../types';

interface TaskState {
  tasks: Task[];
  dailyMood: Mood | null;
  selectedFilter: 'today' | 'week' | 'month' | 'all';
  activeFocusSession: { taskId: string; startTime: number; duration: number } | null;
  isFocusModeOpen: boolean; // <-- Novo estado

  addTask: (task: Task) => void;
  toggleTaskCompletion: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  setDailyMood: (mood: Mood) => void;
  setFilter: (filter: 'today' | 'week' | 'month' | 'all') => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;

  startFocus: (taskId: string, durationMinutes: number) => void;
  stopFocus: () => void;
  toggleFocusMode: (isOpen: boolean) => void;
  updateTask: (taskId: string, updatedTask: Partial<Task>) => void;
  markTaskFailed: (taskId: string) => void;
  clearCompletedTasks: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      dailyMood: null,
      selectedFilter: 'today',
      activeFocusSession: null,
      isFocusModeOpen: false,

      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

              toggleTaskCompletion: (taskId) => set((state) => {
                // Se a tarefa sendo concluída for a que está no foco, encerramos a sessão de foco também
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

              deleteTask: (taskId) => set((state) => ({
                tasks: state.tasks.filter((t) => t.id !== taskId)
              })),

              setDailyMood: (dailyMood) => set({ dailyMood }),

              setFilter: (selectedFilter) => set({ selectedFilter }),

              toggleSubtask: (taskId, subtaskId) => set((state) => ({
                tasks: state.tasks.map((t) =>
                t.id === taskId
                ? { ...t, subtasks: t.subtasks?.map((st) => st.id === subtaskId ? { ...st, completed: !st.completed } : st) }
                : t
                )
              })),

              startFocus: (taskId, durationMinutes) => set((state) => {
                // Se já tem um timer rodando para essa tarefa, não reinicia, apenas abre a tela
                if (state.activeFocusSession?.taskId === taskId) {
                  return { isFocusModeOpen: true };
                }
                // Se for uma nova tarefa, começa o timer
                return {
                  activeFocusSession: { taskId, startTime: Date.now(), duration: durationMinutes * 60 },
                                                           isFocusModeOpen: true
                };
              }),

              stopFocus: () => set({ activeFocusSession: null, isFocusModeOpen: false }),

              toggleFocusMode: (isOpen) => set({ isFocusModeOpen: isOpen }),

              // Edição de Tarefa
              updateTask: (taskId, updatedTask) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === taskId ? { ...t, ...updatedTask } : t)
              })),

              // Marca como "Task Mal-Sucedida" após expiração do Timer
              markTaskFailed: (taskId) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === taskId ? { ...t, isFailed: true } : t)
              })),

              // Limpa tasks concluídas
              clearCompletedTasks: () => set((state) => ({
                tasks: state.tasks.filter((t) => !t.isCompleted)
              })),
    }),
    { name: 'lida-tasks' }
  )
);
