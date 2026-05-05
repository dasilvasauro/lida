export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type TaskType = 'normal' | 'daily_challenge' | 'sprint' | 'time' | 'bonus' | 'surprise' | 'routine';
export type Mood = 'radiant' | 'happy' | 'normal' | 'annoyed' | 'disappointed';
export type ItemColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'indigo' | 'zinc'; // <-- Centralizado para uso geral

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Folder {
  id: string;
  name: string;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  items: string[];
  weekdays: number[];
  color: ItemColor; // <-- NOVO: Cor da Rotina
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string; 
  type: TaskType;
  priority: Priority;
  color?: ItemColor; // <-- NOVO: A tarefa vai herdar a cor da rotina
  subtasks?: SubTask[];
  createdAt: number;
  deadlineDate?: string;
  deadlineTime?: string;
  duration?: number;
  routineTemplateId?: string; 
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

export type ReflectionColor = ItemColor;

export interface Reflection {
  id: string;
  title: string;
  color: ReflectionColor;
  cards: string[];
  createdAt: number;
}