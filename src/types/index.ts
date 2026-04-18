export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type TaskType = 'normal' | 'daily_challenge' | 'sprint' | 'time' | 'bonus' | 'surprise';

export type Mood = 'radiant' | 'happy' | 'normal' | 'annoyed' | 'disappointed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  subtasks?: SubTask[];
  createdAt: number; // Timestamp
  deadlineDate?: string; // Formato YYYY-MM-DD
  deadlineTime?: string; // Formato HH:MM
  duration?: number;
  recurrence?: {
    type: 'none' | 'weekly' | 'monthly' | 'yearly';
    weekdays?: number[]; // 0-6 (Dom-Sab)
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  isCompleted: boolean;
  completedAt?: number;
  folderId: string; // 'default' para a pasta inicial
}
