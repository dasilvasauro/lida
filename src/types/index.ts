export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type TaskType = 'normal' | 'daily_challenge' | 'sprint' | 'time' | 'bonus' | 'surprise' | 'routine';
export type Mood = 'radiant' | 'happy' | 'normal' | 'annoyed' | 'disappointed';
export type ItemColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'indigo' | 'zinc'; 

export interface SubTask { id: string; title: string; completed: boolean; }
export interface Folder { id: string; name: string; updatedAt?: number; }

export interface RoutineTemplate {
  id: string; title: string; items: string[]; weekdays: number[];
  color: ItemColor; createdAt: number; updatedAt?: number;
  isFreeEditExpired?: boolean;
}

export interface Task {
  id: string; title: string; description?: string; status?: string; 
  type: TaskType; priority: Priority; color?: ItemColor; 
  subtasks?: SubTask[]; createdAt: number; updatedAt?: number; deadlineDate?: string;
  deadlineTime?: string; duration?: number; routineTemplateId?: string; 
  recurrence?: { type: 'none' | 'weekly' | 'monthly' | 'yearly'; weekdays?: number[]; dayOfMonth?: number; monthOfYear?: number; };
  isCompleted: boolean; completedAt?: number; isFailed?: boolean;
  folderId: string; hasRespite?: boolean; hasRelief?: boolean;  
  hasMagicDice?: boolean; isArchived?: boolean; nextRecurrenceGenerated?: boolean; 
  isFreeEditExpired?: boolean;
}

export interface Habit {
  id: string; title: string; description?: string; goal: number; createdAt: number; updatedAt?: number;
  isFreeEditExpired?: boolean;
}

export type GoalState = 1 | 2 | 3 | 4 | 5;
export interface BigGoal { id: string; title: string; state: GoalState; }
export interface Vision { traitsToDevelop: string[]; traitsToAbandon: string[]; goals: BigGoal[]; checkpoints: string[]; createdAt: number; updatedAt?: number; }
export type ReflectionColor = ItemColor;
export interface Reflection { id: string; title: string; color: ReflectionColor; cards: string[]; createdAt: number; updatedAt?: number; }

export type NoteFont = 'sans' | 'serif' | 'handwriting';
export type NoteFormat = 'richtext' | 'markdown';
export interface Notebook { id: string; name: string; color: ItemColor; isLocked: boolean; password?: string; createdAt: number; updatedAt?: number; }

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
    createdAt: number; 
    updatedAt: number;
    isFavorite?: boolean;
    isPinned?: boolean; 
}

export type BrainDumpQuadrant = 'unorganized' | 'now' | 'schedule' | 'delegate' | 'incubator';

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

// === TIPAGENS DO QUITTER ===
export interface QuitterItem {
  id: string;
  title: string;
  createdAt: number;
  lastRelapseAt: number;
  checkins: string[]; 
  rewardCycle: number; // Agora inicia em 0 e vai incrementando até 7
  updatedAt?: number;
}