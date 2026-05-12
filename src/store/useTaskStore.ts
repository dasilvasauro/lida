import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Mood, Folder, RoutineTemplate, BrainDumpState, BrainDumpItem, BrainDumpQuadrant } from '../types';
import { format, addDays, addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore } from './useConfigStore';
import { useEconomyStore } from './useEconomyStore';

const calculateNextRecurrence = (currentDateStr: string | undefined, recurrence: Task['recurrence']): string | null => {
  if (!recurrence || recurrence.type === 'none') return null;
  const baseDate = currentDateStr ? new Date(Number(currentDateStr.split('-')[0]), Number(currentDateStr.split('-')[1]) - 1, Number(currentDateStr.split('-')[2])) : new Date();

  if (recurrence.type === 'weekly' && recurrence.weekdays && recurrence.weekdays.length > 0) {
    const sortedDays = [...recurrence.weekdays].sort((a, b) => a - b);
    const currentDayOfWeek = baseDate.getDay();
    const nextDay = sortedDays.find(d => d > currentDayOfWeek);
    if (nextDay !== undefined) { const daysToAdd = nextDay - currentDayOfWeek; return format(addDays(baseDate, daysToAdd), 'yyyy-MM-dd'); } 
    else { const daysToAdd = 7 - currentDayOfWeek + sortedDays[0]; return format(addDays(baseDate, daysToAdd), 'yyyy-MM-dd'); }
  }
  if (recurrence.type === 'monthly' && recurrence.dayOfMonth) {
    const nextMonthDate = addMonths(baseDate, 1); const year = nextMonthDate.getFullYear(); const month = nextMonthDate.getMonth();
    const daysInNextMonth = new Date(year, month + 1, 0).getDate(); const targetDay = Math.min(recurrence.dayOfMonth, daysInNextMonth);
    return format(new Date(year, month, targetDay), 'yyyy-MM-dd');
  }
  if (recurrence.type === 'yearly' && recurrence.dayOfMonth && recurrence.monthOfYear !== undefined) {
    const year = baseDate.getFullYear() + 1; const daysInTargetMonth = new Date(year, recurrence.monthOfYear + 1, 0).getDate();
    const targetDay = Math.min(recurrence.dayOfMonth, daysInTargetMonth);
    return format(new Date(year, recurrence.monthOfYear, targetDay), 'yyyy-MM-dd');
  }
  return null;
};

interface TaskState {
  tasks: Task[]; folders: Folder[]; routines: RoutineTemplate[]; dailyMood: Mood | null; moodHistory: Record<string, Mood>;
  selectedFilter: 'today' | 'week' | 'month' | 'all'; selectedFolderId: string;
  activeFocusSession: { taskId: string; startTime: number; duration: number } | null;
  isFocusModeOpen: boolean; isGlobalModalOpen: boolean; isRoutineModalOpen: boolean;
  
  brainDump: BrainDumpState;

  setGlobalModalOpen: (isOpen: boolean) => void; setRoutineModalOpen: (isOpen: boolean) => void; 
  addTask: (task: Task) => void; toggleTaskCompletion: (taskId: string) => void; deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updatedTask: Partial<Task>) => void;
  addFolder: (folder: Folder) => void; deleteFolder: (folderId: string) => void; setFolderId: (folderId: string) => void;
  
  addRoutine: (routine: RoutineTemplate) => void; updateRoutine: (id: string, updated: Partial<RoutineTemplate>) => void; deleteRoutine: (id: string) => void;
  setDailyMood: (mood: Mood) => void; setFilter: (filter: 'today' | 'week' | 'month' | 'all') => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  startFocus: (taskId: string, durationMinutes: number) => void; stopFocus: () => void;
  toggleFocusMode: (isOpen: boolean) => void; 
  markTaskFailed: (taskId: string) => void; clearCompletedTasks: () => void;
  applyPowerUp: (taskId: string, type: 'respite' | 'relief' | 'magicDice') => void;
  processNewDay: (todayStr: string) => void;

  setBrainDump: (items: BrainDumpItem[]) => void;
  updateBrainDumpItem: (id: string, quadrant: BrainDumpQuadrant) => void;
  removeBrainDumpItem: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [], folders: [{ id: 'default', name: 'Geral', updatedAt: 0 }], routines: [], dailyMood: null, moodHistory: {},
      selectedFilter: 'today', selectedFolderId: 'all', activeFocusSession: null, 
      isFocusModeOpen: false, isGlobalModalOpen: false, isRoutineModalOpen: false,

      brainDump: { lastDumpAt: null, items: [] },

      setBrainDump: (items) => set({ brainDump: { lastDumpAt: Date.now(), items } }),
      updateBrainDumpItem: (id, quadrant) => set((state) => ({ brainDump: { ...state.brainDump, items: state.brainDump.items.map(i => i.id === id ? { ...i, quadrant } : i) } })),
      removeBrainDumpItem: (id) => set((state) => ({ brainDump: { ...state.brainDump, items: state.brainDump.items.filter(i => i.id !== id) } })),

      setGlobalModalOpen: (isOpen) => set({ isGlobalModalOpen: isOpen }), setRoutineModalOpen: (isOpen) => set({ isRoutineModalOpen: isOpen }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, { ...task, updatedAt: Date.now() }] })),
      toggleTaskCompletion: (taskId) => set((state) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return state;
        const isCompleting = !task.isCompleted;
        const isCompletingActive = state.activeFocusSession?.taskId === taskId;
        return { tasks: state.tasks.map((t) => t.id === taskId ? { ...t, isCompleted: isCompleting, completedAt: isCompleting ? Date.now() : undefined, updatedAt: Date.now() } : t), ...(isCompletingActive ? { activeFocusSession: null, isFocusModeOpen: false } : {}) };
      }),
      deleteTask: (taskId) => { useConfigStore.getState().addTombstone(taskId); set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })); },
      updateTask: (taskId, updatedTask) => set((state) => ({ tasks: state.tasks.map((t) => t.id === taskId ? { ...t, ...updatedTask, updatedAt: Date.now() } : t) })),
      
      addFolder: (folder) => set((state) => ({ folders: [...state.folders, { ...folder, updatedAt: Date.now() }] })), setFolderId: (folderId) => set({ selectedFolderId: folderId }),
      deleteFolder: (folderId) => { useConfigStore.getState().addTombstone(folderId); set((state) => ({ folders: state.folders.filter(f => f.id !== folderId), tasks: state.tasks.map(t => t.folderId === folderId ? { ...t, folderId: 'default', updatedAt: Date.now() } : t), selectedFolderId: state.selectedFolderId === folderId ? 'all' : state.selectedFolderId })); },

      addRoutine: (routine) => set((state) => {
        const todayObj = new Date(); const todayStr = format(todayObj, 'yyyy-MM-dd'); const dayOfWeek = todayObj.getDay(); let newTasks = [...state.tasks];
        if (routine.weekdays.includes(dayOfWeek)) {
            newTasks.push({ id: uuidv4(), title: routine.title, type: 'routine', priority: 'P4', color: routine.color, folderId: 'default', createdAt: Date.now(), updatedAt: Date.now(), deadlineDate: todayStr, isCompleted: false, subtasks: routine.items.map(title => ({ id: uuidv4(), title, completed: false })), routineTemplateId: routine.id, isFreeEditExpired: true });
        }
        return { routines: [...state.routines, { ...routine, updatedAt: Date.now() }], tasks: newTasks };
      }),
      updateRoutine: (id, updated) => set((state) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return { routines: state.routines.map(r => r.id === id ? { ...r, ...updated, updatedAt: Date.now() } : r), tasks: state.tasks.map(t => { if (t.routineTemplateId === id && t.deadlineDate === todayStr && !t.isCompleted) { return { ...t, title: updated.title || t.title, color: updated.color || t.color, updatedAt: Date.now(), subtasks: updated.items ? updated.items.map(title => ({ id: uuidv4(), title, completed: false })) : t.subtasks }; } return t; }) };
      }),
      deleteRoutine: (id) => { useConfigStore.getState().addTombstone(id); set((state) => { const todayStr = format(new Date(), 'yyyy-MM-dd'); return { routines: state.routines.filter(r => r.id !== id), tasks: state.tasks.filter(t => !(t.routineTemplateId === id && t.deadlineDate === todayStr && !t.isCompleted)) }; }); },

      setDailyMood: (mood) => set((state) => { const todayStr = format(new Date(), 'yyyy-MM-dd'); return { dailyMood: mood, moodHistory: { ...state.moodHistory, [todayStr]: mood } }; }),
      setFilter: (selectedFilter) => set({ selectedFilter }),
      toggleSubtask: (taskId, subtaskId) => set((state) => ({ tasks: state.tasks.map((t) => t.id === taskId ? { ...t, updatedAt: Date.now(), subtasks: t.subtasks?.map((st) => st.id === subtaskId ? { ...st, completed: !st.completed } : st) } : t) })),
      startFocus: (taskId, durationMinutes) => set((state) => { if (state.activeFocusSession?.taskId === taskId) return { isFocusModeOpen: true }; return { activeFocusSession: { taskId, startTime: Date.now(), duration: durationMinutes * 60 }, isFocusModeOpen: true }; }),
      stopFocus: () => set({ activeFocusSession: null, isFocusModeOpen: false }), toggleFocusMode: (isOpen) => set({ isFocusModeOpen: isOpen }),
      markTaskFailed: (taskId) => set((state) => ({ tasks: state.tasks.map((t) => t.id === taskId ? { ...t, isFailed: true, updatedAt: Date.now() } : t) })),
      clearCompletedTasks: () => set((state) => ({ tasks: state.tasks.map((t) => t.isCompleted ? { ...t, isArchived: true, updatedAt: Date.now() } : t) })),

      applyPowerUp: (taskId, type) => set((state) => ({ tasks: state.tasks.map(t => { if (t.id !== taskId) return t; if (type === 'magicDice') return { ...t, hasMagicDice: true, updatedAt: Date.now() }; if (type === 'respite') { let newTime = t.deadlineTime; if (newTime) { const [h, m] = newTime.split(':').map(Number); const newH = Math.min(23, h + 3); newTime = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; } return { ...t, hasRespite: true, deadlineTime: newTime, updatedAt: Date.now() }; } if (type === 'relief') { let newDate = t.deadlineDate; if (newDate) { const dateObj = new Date(newDate + 'T12:00:00'); dateObj.setDate(dateObj.getDate() + 1); newDate = dateObj.toISOString().split('T')[0]; } return { ...t, hasRelief: true, deadlineDate: newDate, updatedAt: Date.now() }; } return t; }) })),

      processNewDay: (todayStr) => {
        const { tasks, routines } = get();
        const { enablePunishments } = useConfigStore.getState();
        const newTasks = [...tasks]; let changed = false; let totalLostXp = 0; let totalLostGold = 0;

        for (let i = 0; i < newTasks.length; i++) {
          const t = newTasks[i];
          const isDailyChallengeOverdue = t.type === 'daily_challenge' && format(new Date(t.createdAt), 'yyyy-MM-dd') < todayStr;
          const isSprintOverdue = t.type === 'sprint' && t.deadlineDate && t.deadlineDate < todayStr;
          const isNormalOverdue = t.type === 'normal' && t.deadlineDate && t.deadlineDate < todayStr;

          if (!t.isCompleted && !t.isFailed && !t.isArchived) {
             if (isDailyChallengeOverdue || isSprintOverdue || isNormalOverdue) {
                 newTasks[i] = { ...t, isFailed: true, updatedAt: Date.now() }; changed = true;
                 if (enablePunishments) {
                    let baseGold = 15; let baseXp = 45;
                    switch (t.priority) { case 'P0': baseGold = 50; baseXp = 150; break; case 'P1': baseGold = 40; baseXp = 100; break; case 'P2': baseGold = 30; baseXp = 75; break; case 'P3': baseGold = 20; baseXp = 50; break; case 'P4': baseGold = 10; baseXp = 25; break; }
                    totalLostXp += baseXp; totalLostGold += baseGold;
                 }
             }
          }

          if (t.type === 'routine' && t.deadlineDate && t.deadlineDate < todayStr && !t.isArchived) {
            if (t.isCompleted) { newTasks[i] = { ...t, isArchived: true, updatedAt: Date.now() }; changed = true; } 
            else { newTasks[i] = { ...t, deadlineDate: todayStr, subtasks: t.subtasks?.map(st => ({ ...st, completed: false })), updatedAt: Date.now() }; changed = true; }
          }

          if (t.isCompleted && t.recurrence && t.recurrence.type !== 'none' && !t.nextRecurrenceGenerated) {
            const completedDateStr = t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd') : '';
            if (completedDateStr && completedDateStr < todayStr) {
              const nextDateStr = calculateNextRecurrence(t.deadlineDate, t.recurrence);
              if (nextDateStr) {
                const isDuplicate = newTasks.some(existing => existing.title === t.title && existing.deadlineDate === nextDateStr && existing.id !== t.id);
                if (!isDuplicate) { newTasks.push({ ...t, id: uuidv4(), isCompleted: false, completedAt: undefined, deadlineDate: nextDateStr, isArchived: false, nextRecurrenceGenerated: false, isFailed: false, subtasks: t.subtasks?.map(st => ({ ...st, completed: false })), isFreeEditExpired: true, updatedAt: Date.now() }); }
                newTasks[i] = { ...t, nextRecurrenceGenerated: true, updatedAt: Date.now() }; changed = true;
              }
            }
          }
        }

        const currentDayOfWeek = new Date(todayStr + 'T12:00:00').getDay();
        routines.forEach(routine => {
            if (routine.weekdays.includes(currentDayOfWeek)) {
                const exists = newTasks.some(t => t.routineTemplateId === routine.id && t.deadlineDate === todayStr && !t.isArchived);
                if (!exists) {
                    newTasks.push({ id: uuidv4(), title: routine.title, type: 'routine', priority: 'P4', color: routine.color, folderId: 'default', createdAt: Date.now(), updatedAt: Date.now(), deadlineDate: todayStr, isCompleted: false, subtasks: routine.items.map(title => ({ id: uuidv4(), title, completed: false })), routineTemplateId: routine.id, isFreeEditExpired: true });
                    changed = true;
                }
            }
        });

        if (totalLostXp > 0 || totalLostGold > 0) useEconomyStore.getState().applyPenalty(totalLostXp, totalLostGold);
        if (changed) set({ tasks: newTasks });
      }
    }),
    { name: 'lida-tasks' }
  )
);