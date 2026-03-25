export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

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
}
