import { create } from 'zustand';
import { api } from '../lib/api';
import type { ChatMessage, ChatThread, ChatUnreadSummary } from '@care/shared/types';
import type { ApiResponse } from '@care/shared/types';

interface ChatState {
  threadsByCircle: Record<string, ChatThread[]>;
  messagesByThread: Record<string, ChatMessage[]>;
  /** Messages from others after read cursor; drives badges. */
  unreadByThread: Record<string, number>;
  totalUnread: number;
  fetchThreads: (circleId: string) => Promise<void>;
  /** Load threads for every circle (chat hub). */
  fetchThreadsForCircles: (circleIds: string[]) => Promise<void>;
  fetchMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, body: string) => Promise<void>;
  createThread: (circleId: string, title: string) => Promise<ChatThread>;
  /** Default thread for messaging (first fetch per circle). */
  getDefaultThreadId: (circleId: string) => string | null;
  fetchUnreadSummary: () => Promise<void>;
  markThreadRead: (threadId: string, lastReadAt: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threadsByCircle: {},
  messagesByThread: {},
  unreadByThread: {},
  totalUnread: 0,

  getDefaultThreadId: (circleId) => {
    const threads = get().threadsByCircle[circleId];
    if (!threads?.length) return null;
    const def = threads.find((t) => t.isDefault);
    return (def ?? threads[0]).id;
  },

  fetchThreads: async (circleId) => {
    const res = await api.get<ApiResponse<ChatThread[]>>(`/circles/${circleId}/threads`);
    set((s) => ({
      threadsByCircle: { ...s.threadsByCircle, [circleId]: res.data },
    }));
  },

  fetchThreadsForCircles: async (circleIds) => {
    await Promise.all(circleIds.map((id) => get().fetchThreads(id)));
  },

  createThread: async (circleId, title) => {
    const res = await api.post<ApiResponse<ChatThread>>(`/circles/${circleId}/threads`, {
      title: title.trim(),
    });
    await get().fetchThreads(circleId);
    return res.data;
  },

  fetchMessages: async (threadId) => {
    const res = await api.get<ApiResponse<ChatMessage[]>>(`/chat/threads/${threadId}/messages`);
    set((s) => ({
      messagesByThread: { ...s.messagesByThread, [threadId]: res.data },
    }));
  },

  sendMessage: async (threadId, body) => {
    const res = await api.post<ApiResponse<ChatMessage>>(`/chat/threads/${threadId}/messages`, {
      body,
    });
    set((s) => {
      const prev = s.messagesByThread[threadId] ?? [];
      return {
        messagesByThread: {
          ...s.messagesByThread,
          [threadId]: [...prev, res.data],
        },
      };
    });
  },

  fetchUnreadSummary: async () => {
    try {
      const res = await api.get<ApiResponse<ChatUnreadSummary>>('/chat/unread-summary');
      set({
        totalUnread: res.data.totalUnread,
        unreadByThread: res.data.byThread,
      });
    } catch {
      /* offline / unauthenticated */
    }
  },

  markThreadRead: async (threadId, lastReadAt) => {
    await api.patch(`/chat/threads/${threadId}/read`, { lastReadAt });
    await get().fetchUnreadSummary();
  },
}));
