import type { User } from './user';

export interface ChatThread {
  id: string;
  circleId: string;
  title: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

/** Counts of messages from others after the user’s read cursor, keyed by thread id. */
export interface ChatUnreadSummary {
  totalUnread: number;
  byThread: Record<string, number>;
}
