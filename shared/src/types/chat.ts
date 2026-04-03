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
