import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Mood, Folder } from '../types';
import { format, addDays, addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// MOTOR DE RECORRÊNCIA: Calcula a próxima data baseado na regra da tarefa
const calculateNextRecurrence = (currentDateStr: string | undefined, recurrence: Task['recurrence']): string | null => {
  if (!recurrence || recurrence.type === 'none') return null;

  // Cria a data localmente evitando bugs de fuso horário (UTC vs GMT-3)
  const baseDate = currentDateStr 
    ? new Date(Number(currentDateStr.split('-')[0]), Number(currentDateStr.split('-')[1]) - 1, Number(currentDateStr.split('-')[2])) 
    : new Date();

  if (recurrence.type === 'weekly' && recurrence.weekdays && recurrence.weekdays.length > 0) {
    const sortedDays = [...recurrence.weekdays].sort((a, b) => a - b);
    const currentDayOfWeek = baseDate.getDay();
    const nextDay = sortedDays.find(d => d > currentDayOfWeek);

    if (nextDay !== undefined) {
      const daysToAdd = nextDay - currentDayOfWeek;
      return format(addDays(baseDate, daysToAdd), 'yyyy-MM-dd');
    } else {
      const daysToAdd = 7 - currentDayOfWeek + sortedDays[0];
      return format(addDays(baseDate, daysToAdd), 'yyyy-MM-dd');
    }
  }

  if (recurrence.type === 'monthly' && recurrence.dayOfMonth) {
    const nextMonthDate = addMonths(baseDate, 1);
    const year = nextMonthDate.getFullYear();
    const month = nextMonthDate.getMonth();
    const daysInNextMonth = new Date(year, month + 1, 0).getDate();
    const targetDay = Math.min(recurrence.dayOfMonth, daysInNextMonth);
    return format(new Date(year, month, targetDay), 'yyyy-MM-dd');
  }

  if (recurrence.type === 'yearly' && recurrence.dayOfMonth && recurrence.monthOfYear !== undefined) {
    const year = baseDate.getFullYear() + 1;
    const daysInTargetMonth = new Date(year, recurrence.monthOfYear + 1, 0).getDate();
    const targetDay = Math.min(recurrence.dayOfMonth, daysInTargetMonth);
    return format(new Date(year, recurrence.monthOfYear, targetDay), 'yyyy-MM-dd');
  }

  return null;
};

interface TaskState {
  tasks: Task[];
  folders: Folder[];
  dailyMood: Mood | null;
  moodHistory: Record<string, Mood>;
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
  failPastDailyChallenges: (todayStr: string) => void;
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
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return state;

        const isCompleting = !task.isCompleted;
        const isCompletingActive = state.activeFocusSession?.taskId === taskId;

        const newTasks = state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, isCompleted: isCompleting, completedAt: isCompleting ? Date.now() : undefined }
            : t
        );

        // GERAÇÃO DA PRÓXIMA RECORRÊNCIA SE A TAREFA FOI MARCADA COMO FEITA
        if (isCompleting && task.recurrence && task.recurrence.type !== 'none') {
          const nextDateStr = calculateNextRecurrence(task.deadlineDate, task.recurrence);
          
          if (nextDateStr) {
            // Escudo de duplicação: evita gerar 2x se o usuário clicar muito rápido
            const futureTaskExists = state.tasks.some(t => 
              t.title === task.title && 
              t.deadlineDate === nextDateStr && 
              !t.isCompleted
            );

            if (!futureTaskExists) {
              const nextTask: Task = {
                ...task,
                id: uuidv4(), // ID novo para a nova tarefa
                createdAt: Date.now(),
                isCompleted: false,
                completedAt: undefined,
                deadlineDate: nextDateStr,
                // Reseta as subtarefas e powerups para a próxima rodada
                subtasks: task.subtasks?.map(st => ({ ...st, completed: false })),
                hasRespite: false,
                hasRelief: false,
                hasMagicDice: false,
                isFailed: false,
              };
              newTasks.push(nextTask);
            }
          }
        }

        return {
          tasks: newTasks,
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
      })),

      failPastDailyChallenges: (todayStr) => set((state) => ({
        tasks: state.tasks.map((t) => {
          if (t.type === 'daily_challenge' && !t.isCompleted && !t.isFailed) {
            const createdAtStr = format(new Date(t.createdAt), 'yyyy-MM-dd');
            if (createdAtStr < todayStr) {
              return { ...t, isFailed: true };
            }
          }
          return t;
        })
      }))
    }),
    { name: 'lida-tasks' }
  )
);