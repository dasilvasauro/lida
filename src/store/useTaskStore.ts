import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { Task, Mood, Folder, RoutineTemplate, BrainDumpState, BrainDumpItem, BrainDumpQuadrant, PomodoroState, Priority } from '../types';
import { format, addDays, addMonths, differenceInDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore } from './useConfigStore';
import { useEconomyStore } from './useEconomyStore';
import { useHabitStore } from './useHabitStore';
import { useScoreStore } from './useScoreStore';

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

const obfuscatedStorage: StateStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try { JSON.parse(str); return str; } catch { try { return decodeURIComponent(atob(str)); } catch { return null; } }
  },
  setItem: (name, value) => { localStorage.setItem(name, btoa(encodeURIComponent(value))); },
  removeItem: (name) => localStorage.removeItem(name),
};

const PRIORITY_WEIGHTS: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
const PRIORITY_SCORE_VALUE: Record<Priority, number> = { P0: 5, P1: 4, P2: 3, P3: 2, P4: 1 };
const PRIORITY_FAIL_PENALTY: Record<Priority, number> = { P0: 8, P1: 6, P2: 4, P3: 2, P4: 1 };

interface TaskState {
  tasks: Task[]; folders: Folder[]; routines: RoutineTemplate[]; dailyMood: Mood | null; moodHistory: Record<string, Mood>;
  selectedFilter: 'all' | 'today' | 'week' | 'month' | 'unplanned'; selectedFolderId: string;
  activeFocusSession: { taskId: string; startTime: number; duration: number } | null;
  isFocusModeOpen: boolean; isGlobalModalOpen: boolean; isRoutineModalOpen: boolean;
  brainDump: BrainDumpState;
  
  pomodoro: PomodoroState; 

  setGlobalModalOpen: (isOpen: boolean) => void; setRoutineModalOpen: (isOpen: boolean) => void; 
  addTask: (task: Task) => void; toggleTaskCompletion: (taskId: string) => void; deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updatedTask: Partial<Task>) => void;
  retroactiveCompleteTask: (taskId: string, dateStr: string) => void;

  addFolder: (folder: Folder) => void; deleteFolder: (folderId: string) => void; setFolderId: (folderId: string) => void;
  addRoutine: (routine: RoutineTemplate) => void; updateRoutine: (id: string, updated: Partial<RoutineTemplate>) => void; deleteRoutine: (id: string) => void;
  setDailyMood: (mood: Mood) => void; setFilter: (filter: 'all' | 'today' | 'week' | 'month' | 'unplanned') => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  startFocus: (taskId: string, durationMinutes: number) => void; stopFocus: () => void;
  toggleFocusMode: (isOpen: boolean) => void; 
  markTaskFailed: (taskId: string) => void; clearCompletedTasks: () => void;
  applyPowerUp: (taskId: string, type: 'respite' | 'relief' | 'magicDice') => void;
  
  processNewDay: (todayStr: string, lastLoginStr: string | null) => void;

  setBrainDump: (items: BrainDumpItem[]) => void;
  updateBrainDumpItem: (id: string, quadrant: BrainDumpQuadrant) => void;
  removeBrainDumpItem: (id: string) => void;
  markBrainDumpItemConverted: (id: string, type: 'task' | 'note') => void;
  clearBrainDump: () => void; 

  updatePomodoro: (partial: Partial<PomodoroState>) => void;
  tickPomodoro: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [], folders: [{ id: 'default', name: 'Geral', updatedAt: 0 }], routines: [], dailyMood: null, moodHistory: {},
      selectedFilter: 'all', selectedFolderId: 'all', activeFocusSession: null, 
      isFocusModeOpen: false, isGlobalModalOpen: false, isRoutineModalOpen: false,
      brainDump: { lastDumpAt: null, items: [] },

      pomodoro: { isOpen: false, isMinimized: false, isActive: false, mode: 'focus', timeLeft: 25 * 60, focusDuration: 25, breakDuration: 5, accumulatedSeconds: 0, soundEnabled: true },

      updatePomodoro: (partial) => set((state) => ({ pomodoro: { ...state.pomodoro, ...partial } })),
      
      tickPomodoro: () => set((state) => {
        const p = state.pomodoro;
        if (!p.isActive) return state;

        let newTimeLeft = p.timeLeft - 1;
        let newAccumulated = p.accumulatedSeconds;

        if (p.mode === 'focus') {
            newAccumulated += 1;
            if (newAccumulated >= 3600) {
                setTimeout(() => {
                    useEconomyStore.getState().addVouchers(1);
                    window.dispatchEvent(new CustomEvent('pomodoro-voucher'));
                }, 0);
                newAccumulated -= 3600;
            }
        }

        let newMode: 'focus' | 'break' = p.mode;
        let newIsActive: boolean = p.isActive; 

        if (newTimeLeft <= 0) {
            setTimeout(() => window.dispatchEvent(new CustomEvent('pomodoro-ring')), 0); 
            if (p.mode === 'focus') {
                newMode = 'break';
                newTimeLeft = p.breakDuration * 60;
            } else {
                newMode = 'focus';
                newTimeLeft = p.focusDuration * 60;
                newIsActive = false; 
            }
        }

        return { pomodoro: { ...p, timeLeft: newTimeLeft, accumulatedSeconds: newAccumulated, mode: newMode, isActive: newIsActive } };
      }),

      setBrainDump: (items) => set({ brainDump: { lastDumpAt: Date.now(), items } }),
      updateBrainDumpItem: (id, quadrant) => set((state) => ({ brainDump: { ...state.brainDump, items: state.brainDump.items.map(i => i.id === id ? { ...i, quadrant } : i) } })),
      removeBrainDumpItem: (id) => set((state) => ({ brainDump: { ...state.brainDump, items: state.brainDump.items.filter(i => i.id !== id) } })),
      markBrainDumpItemConverted: (id, type) => set((state) => ({ brainDump: { ...state.brainDump, items: state.brainDump.items.map(i => i.id === id ? { ...i, convertedTo: type } : i) } })),
      clearBrainDump: () => set((state) => ({ brainDump: { ...state.brainDump, items: [] } })),

      setGlobalModalOpen: (isOpen) => set({ isGlobalModalOpen: isOpen }), setRoutineModalOpen: (isOpen) => set({ isRoutineModalOpen: isOpen }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, { ...task, postponedCount: 0, reprioritizedCount: 0, updatedAt: Date.now() }] })),
      
      toggleTaskCompletion: (taskId) => set((state) => {
        const taskIndex = state.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return state;
        const task = state.tasks[taskIndex];
        const isCompleting = !task.isCompleted;
        const isCompletingActive = state.activeFocusSession?.taskId === taskId;
        
        let newTasks = [...state.tasks];
        const updatedTask = { ...task, isCompleted: isCompleting, completedAt: isCompleting ? Date.now() : undefined, updatedAt: Date.now() };
        newTasks[taskIndex] = updatedTask;

        // NOVO NÚCLEO DE REPETIÇÃO
        if (isCompleting && !task.nextRecurrenceGenerated) {
            if (task.type === 'routine' && task.routineTemplateId) {
                const routine = state.routines.find(r => r.id === task.routineTemplateId);
                if (routine && routine.weekdays.length > 0) {
                    let nextDate = addDays(new Date((task.deadlineDate || format(new Date(), 'yyyy-MM-dd')) + 'T12:00:00'), 1);
                    while (!routine.weekdays.includes(nextDate.getDay())) { nextDate = addDays(nextDate, 1); }
                    const nextDateStr = format(nextDate, 'yyyy-MM-dd');
                    newTasks.push({ ...task, id: uuidv4(), isCompleted: false, completedAt: undefined, deadlineDate: nextDateStr, nextRecurrenceGenerated: false, isFailed: false, isArchived: false, subtasks: task.subtasks?.map(st => ({...st, completed: false})), updatedAt: Date.now() });
                    updatedTask.nextRecurrenceGenerated = true;
                }
            } else if (task.recurrence && task.recurrence.type !== 'none') {
                const nextDateStr = calculateNextRecurrence(task.deadlineDate, task.recurrence);
                if (nextDateStr) {
                    newTasks.push({ ...task, id: uuidv4(), isCompleted: false, completedAt: undefined, deadlineDate: nextDateStr, nextRecurrenceGenerated: false, isFailed: false, isArchived: false, subtasks: task.subtasks?.map(st => ({...st, completed: false})), updatedAt: Date.now() });
                    updatedTask.nextRecurrenceGenerated = true;
                }
            }
        }

        return { tasks: newTasks, ...(isCompletingActive ? { activeFocusSession: null, isFocusModeOpen: false } : {}) };
      }),

      deleteTask: (taskId) => { useConfigStore.getState().addTombstone(taskId); set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })); },
      
      updateTask: (taskId, updatedTask) => set((state) => {
        return { tasks: state.tasks.map(t => {
            if (t.id !== taskId) return t;

            let pCount = t.postponedCount || 0;
            let rCount = t.reprioritizedCount || 0;

            if (updatedTask.deadlineDate && t.deadlineDate && updatedTask.deadlineDate > t.deadlineDate) { pCount += 1; }
            if (updatedTask.priority && t.priority && PRIORITY_WEIGHTS[updatedTask.priority] < PRIORITY_WEIGHTS[t.priority]) { rCount += 1; }

            return { ...t, ...updatedTask, postponedCount: pCount, reprioritizedCount: rCount, updatedAt: Date.now() };
        })};
      }),
      
      retroactiveCompleteTask: (taskId, dateStr) => set((state) => {
        const retroTime = new Date(dateStr + 'T23:59:59').getTime();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return state;

        const updatedTask = { ...task, isCompleted: true, completedAt: retroTime, updatedAt: Date.now() };
        let newTasks = state.tasks.map(t => t.id === taskId ? updatedTask : t);

        // Gera a próxima recorrência mesmo no perdão
        if (!task.nextRecurrenceGenerated) {
             if (task.type === 'routine' && task.routineTemplateId) {
                const routine = state.routines.find(r => r.id === task.routineTemplateId);
                if (routine && routine.weekdays.length > 0) {
                    let nextDate = addDays(new Date((task.deadlineDate || format(new Date(), 'yyyy-MM-dd')) + 'T12:00:00'), 1);
                    while (!routine.weekdays.includes(nextDate.getDay())) { nextDate = addDays(nextDate, 1); }
                    newTasks.push({ ...task, id: uuidv4(), isCompleted: false, completedAt: undefined, deadlineDate: format(nextDate, 'yyyy-MM-dd'), nextRecurrenceGenerated: false, isFailed: false, isArchived: false, subtasks: task.subtasks?.map(st => ({...st, completed: false})), updatedAt: Date.now() });
                    updatedTask.nextRecurrenceGenerated = true;
                }
            } else if (task.recurrence && task.recurrence.type !== 'none') {
                const nextDateStr = calculateNextRecurrence(task.deadlineDate, task.recurrence);
                if (nextDateStr) {
                    newTasks.push({ ...task, id: uuidv4(), isCompleted: false, completedAt: undefined, deadlineDate: nextDateStr, nextRecurrenceGenerated: false, isFailed: false, isArchived: false, subtasks: task.subtasks?.map(st => ({...st, completed: false})), updatedAt: Date.now() });
                    updatedTask.nextRecurrenceGenerated = true;
                }
            }
        }
        
        newTasks = newTasks.map(t => t.id === taskId ? updatedTask : t);
        return { tasks: newTasks };
      }),

      addFolder: (folder) => set((state) => ({ folders: [...state.folders, { ...folder, updatedAt: Date.now() }] })), 
      setFolderId: (folderId) => set({ selectedFolderId: folderId }),
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

      processNewDay: (todayStr, lastLoginStr) => {
        const { tasks, routines, moodHistory } = get();
        const { enablePunishments, defaultDaysOff } = useConfigStore.getState();
        const habitStore = useHabitStore.getState();
        const scoreStore = useScoreStore.getState();
        
        let newTasks = [...tasks];
        let newMoodHistory = { ...moodHistory };
        let changed = false;

        const startProcessingDate = lastLoginStr ? new Date(lastLoginStr + 'T12:00:00') : new Date(todayStr + 'T12:00:00');
        const todayObj = new Date(todayStr + 'T12:00:00');

        const diffTotal = differenceInDays(todayObj, startProcessingDate);
        const maxDaysToProcess = Math.min(diffTotal, 30); 

        let processDate = new Date(startProcessingDate);

        while (processDate < todayObj && differenceInDays(todayObj, processDate) <= maxDaysToProcess) {
            const loopDateStr = format(processDate, 'yyyy-MM-dd');
            const dayOfWeek = processDate.getDay();
            const isDayOff = defaultDaysOff.includes(dayOfWeek);

            let totalLostXp = 0; let totalLostGold = 0;
            
            let dayScore = 50; 
            let tasksDoneCount = 0;
            let habitsDoneCount = 0;
            let penaltiesCount = 0;

            if (!newMoodHistory[loopDateStr]) {
                newMoodHistory[loopDateStr] = 'normal';
                changed = true;
            }

            for (let i = 0; i < newTasks.length; i++) {
                const t = newTasks[i];
                
                // Repare: O isRecurring sumiu daqui! Tarefas recorrentes também vão falhar se você deixá-las expirar, e gerar punição.
                if (!t.isCompleted && !t.isFailed && !t.isArchived && t.type !== 'routine') {
                    const isOverdue = t.deadlineDate === loopDateStr;
                    
                    if (isOverdue) {
                        newTasks[i] = { ...t, isFailed: true, updatedAt: Date.now() }; 
                        changed = true;
                        penaltiesCount++;
                        
                        dayScore -= PRIORITY_FAIL_PENALTY[t.priority];

                        if (enablePunishments) {
                            let baseGold = 15; let baseXp = 45;
                            switch (t.priority) { case 'P0': baseGold = 50; baseXp = 150; break; case 'P1': baseGold = 40; baseXp = 100; break; case 'P2': baseGold = 30; baseXp = 75; break; case 'P3': baseGold = 20; baseXp = 50; break; case 'P4': baseGold = 10; baseXp = 25; break; }
                            totalLostXp += baseXp; totalLostGold += baseGold;
                        }
                    }
                }

                if (t.isCompleted && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === loopDateStr) {
                    tasksDoneCount++;
                    let taskPoints = PRIORITY_SCORE_VALUE[t.priority];
                    
                    const daysTaken = differenceInDays(new Date(t.completedAt), new Date(t.createdAt));
                    if (t.priority === 'P0' && daysTaken > 2) taskPoints = Math.max(1, taskPoints - 2);
                    if (t.priority === 'P4' && daysTaken === 0) taskPoints += 1;

                    if (t.postponedCount && t.postponedCount > 0) {
                        taskPoints -= (t.postponedCount * 2);
                        penaltiesCount++;
                    }

                    dayScore += taskPoints;
                }
            }

            habitStore.habits.forEach(habit => {
                const logs = habitStore.logs[habit.id]?.[loopDateStr] || 0;
                const isFrozen = habitStore.modifiers[habit.id]?.[loopDateStr] === 'freeze';
                
                if (logs >= (habit.goal || 1)) {
                    habitsDoneCount++;
                    dayScore += 3; 
                } else if (!isFrozen) {
                    dayScore -= 2;
                    penaltiesCount++;
                }
            });

            if (totalLostXp > 0 || totalLostGold > 0) {
                useEconomyStore.getState().applyPenalty(totalLostXp, totalLostGold);
            }

            if (isDayOff && (tasksDoneCount > 0 || habitsDoneCount > 0)) {
                dayScore += 10;
            }

            scoreStore.recordDailyScore(loopDateStr, dayScore, tasksDoneCount, habitsDoneCount, penaltiesCount);
            processDate.setDate(processDate.getDate() + 1);
        }

        const currentDayOfWeek = todayObj.getDay();
        routines.forEach(routine => {
            if (routine.weekdays.includes(currentDayOfWeek)) {
                const exists = newTasks.some(t => t.routineTemplateId === routine.id && t.deadlineDate === todayStr && !t.isArchived);
                if (!exists) {
                    newTasks.push({ id: uuidv4(), title: routine.title, type: 'routine', priority: 'P4', color: routine.color, folderId: 'default', createdAt: Date.now(), updatedAt: Date.now(), deadlineDate: todayStr, isCompleted: false, subtasks: routine.items.map(title => ({ id: uuidv4(), title, completed: false })), routineTemplateId: routine.id, isFreeEditExpired: true });
                    changed = true;
                }
            }
        });

        if (lastLoginStr) {
            const lastMonth = lastLoginStr.substring(0, 7); 
            const currentMonth = todayStr.substring(0, 7);
            if (lastMonth !== currentMonth) {
                scoreStore.archiveMonth(lastMonth);
            }
        }

        if (changed) set({ tasks: newTasks, moodHistory: newMoodHistory });
      }
    }),
    { name: 'lida-tasks', storage: createJSONStorage(() => obfuscatedStorage) }
  )
);
