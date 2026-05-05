export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type TaskType = 'normal' | 'daily_challenge' | 'sprint' | 'time' | 'bonus' | 'surprise';
export type Mood = 'radiant' | 'happy' | 'normal' | 'annoyed' | 'disappointed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string; // <-- NOVO CAMPO
  type: TaskType;
  priority: Priority;
  subtasks?: SubTask[];
  createdAt: number;
  deadlineDate?: string;
  deadlineTime?: string;
  duration?: number;
  recurrence?: {
    type: 'none' | 'weekly' | 'monthly' | 'yearly';
    weekdays?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  isCompleted: boolean;
  completedAt?: number;
  isFailed?: boolean;
  folderId: string;
  hasRespite?: boolean; 
  hasRelief?: boolean;  
  hasMagicDice?: boolean;
  isArchived?: boolean; 
  nextRecurrenceGenerated?: boolean; 
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  goal: number;
  createdAt: number;
}

export type GoalState = 1 | 2 | 3 | 4 | 5;

export interface BigGoal {
  id: string;
  title: string;
  state: GoalState;
}

export interface Vision {
  traitsToDevelop: string[];
  traitsToAbandon: string[];
  goals: BigGoal[];
  checkpoints: string[]; 
  createdAt: number;
}

export type ReflectionColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'indigo' | 'zinc';

export interface Reflection {
  id: string;
  title: string;
  color: ReflectionColor;
  cards: string[];
  createdAt: number;
}