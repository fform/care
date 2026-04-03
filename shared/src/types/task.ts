export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface TaskSlotCompletion {
  id: string;
  taskId: string;
  /** Calendar date YYYY-MM-DD */
  date: string;
  slotIndex: number;
  completedAt: string;
  completedByUserId: string;
}

export interface Task {
  id: string;
  circleId: string;
  planId: string | null;
  concernId: string | null;
  title: string;
  description: string | null;
  assignedToUserId: string | null;
  status: TaskStatus;
  dueAt: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** When true, use `slotCompletions` per day (e.g. feed 2× daily). */
  isRecurring?: boolean;
  recurrenceSlotTimes?: string[] | null;
  slotCompletions?: TaskSlotCompletion[];
}
