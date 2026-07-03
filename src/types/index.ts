export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type TaskType = 'normal' | 'daily_challenge' | 'sprint' | 'time' | 'bonus' | 'routine';
export type Mood = 'radiant' | 'happy' | 'normal' | 'annoyed' | 'disappointed';
export type ItemColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'indigo' | 'zinc';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string; 
  type: TaskType;
  priority: Priority;
  folderId: string;
  createdAt: number;
  updatedAt: number;
  deadlineDate?: string;
  deadlineTime?: string;
  isCompleted: boolean;
  completedAt?: number;
  isFailed?: boolean;
  isArchived?: boolean;
  duration?: number;
  subtasks?: Subtask[];
  hasMagicDice?: boolean;
  hasRespite?: boolean;
  hasRelief?: boolean;
  routineTemplateId?: string;
  recurrence?: {
    type: 'none' | 'weekly' | 'monthly' | 'yearly';
    weekdays?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  nextRecurrenceGenerated?: boolean;
  isFreeEditExpired?: boolean;
  color?: ItemColor;

  // Novos Tracking de Score
  postponedCount?: number;
  reprioritizedCount?: number;
}

export interface Folder {
  id: string;
  name: string;
  updatedAt: number;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  items: string[];
  weekdays: number[];
  color: ItemColor;
  createdAt: number;
  updatedAt?: number;
}

export type BrainDumpQuadrant = 'now' | 'schedule' | 'delegate' | 'incubator' | 'unorganized';

export interface BrainDumpItem {
  id: string;
  text: string;
  quadrant: BrainDumpQuadrant;
  convertedTo?: 'task' | 'note';
}

export interface BrainDumpState {
  lastDumpAt: number | null;
  items: BrainDumpItem[];
}

export interface PomodoroState {
  isOpen: boolean;
  isMinimized: boolean;
  isActive: boolean;
  mode: 'focus' | 'break';
  timeLeft: number;
  focusDuration: number;
  breakDuration: number;
  accumulatedSeconds: number;
  soundEnabled: boolean;
}

export interface Notebook {
  id: string;
  name: string;
  color: ItemColor;
  isLocked: boolean;
  password?: string;
  createdAt: number;
}

export type NoteFormat = 'richtext' | 'markdown';
export type NoteFont = 'sans' | 'serif' | 'handwriting';

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  format: NoteFormat;
  font: NoteFont;
  hasLines: boolean;
  isLocked: boolean;
  password?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

// === LIDA PRODUCTIVITY INDEX (LPI) ===
export type ScoreGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'E+' | 'E' | 'E-' | 'F';

export interface DailyScore {
  date: string;       // yyyy-MM-dd
  score: number;      // 0 a 100
  tasksDone: number;
  habitsDone: number;
  penalties: number;
}

export interface MonthlyArchive {
  month: string;      // yyyy-MM
  finalScore: number; 
  grade: ScoreGrade;
}

// === HÁBITOS E VÍCIOS ===
export type HabitType = 'good' | 'bad';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  type: HabitType;
  goal?: number;
  unit?: string;
  color: ItemColor;
  icon?: string;
  createdAt: number;
  updatedAt?: number;
  isFreeEditExpired?: boolean;
}

export interface QuitterItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastRelapseAt: number;
  checkins: string[];
  rewardCycle: number;
}


// === CENTRAL DE ATALHOS ===
export type ShortcutType = 'keys' | 'command';
export type ShortcutColor = ItemColor;

export interface ShortcutItem {
  id: string;
  label: string;
  value: string;
  type: ShortcutType;
}

export interface ShortcutCategory {
  id: string;
  title: string;
  color: ShortcutColor;
  items: ShortcutItem[];
  createdAt: number;
  updatedAt?: number;
}

// === REFLEXÕES ===
export type ReflectionColor = ItemColor;

export interface Reflection {
  id: string;
  title: string;
  color: ReflectionColor;
  cards: string[];
  createdAt: number;
  updatedAt?: number;
}

// === VISÃO DE VIDA ===
export type GoalState = 1 | 2 | 3 | 4 | 5;

export interface Goal {
  id: string;
  title: string;
  state: GoalState;
}

export interface Vision {
  traitsToDevelop: string[];
  traitsToAbandon: string[];
  goals: Goal[];
  checkpoints: string[];
  createdAt: number;
}
