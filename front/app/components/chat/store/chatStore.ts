import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ChatMessage } from '../socketClient';
import { ConversationSummary } from '../types';
import { ChatMetaEntry } from '../chatReducer';

export interface ChatState {
  conversations: Record<string, ConversationSummary>;
  messages: Record<string, ChatMessage[]>;
  meta: Record<string, ChatMetaEntry>;
  typing: Record<string, Record<string, number>>; // conversationId -> userId -> last activity
  activeConversationId: string | null;
  messageToConversation: Record<string, string>; // messageId -> conversationId
}

export interface ChatActions {
  // Conversation actions
  setConversations: (conversations: ConversationSummary[]) => void;
  upsertConversation: (conversation: ConversationSummary) => void;
  setActiveConversation: (id: string | null) => void;
  updateParticipantRead: (
    conversationId: string,
    userId: string,
    lastReadAt: string | undefined
  ) => void;

  // Message actions
  upsertMessages: (
    conversationId: string,
    messages: ChatMessage[],
    prepend?: boolean
  ) => void;
  updateMessage: (message: ChatMessage) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  confirmMessage: (tempId: string, realMessage: ChatMessage) => void;
  markMessageError: (tempId: string, error: string) => void;
  resetMessagePending: (id: string) => void;

  // Reaction actions
  updateMessageReactions: (
    conversationId: string,
    messageId: string,
    reactions: ChatMessage["reactions"]
  ) => void;
  addMessageReaction: (
    conversationId: string,
    messageId: string,
    reaction: NonNullable<ChatMessage["reactions"]>[number]
  ) => void;
  removeMessageReaction: (
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string
  ) => void;

  // Meta actions
  updateMeta: (
    conversationId: string,
    patch: Partial<ChatMetaEntry>
  ) => void;

  // Typing actions
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;

  // Utility actions
  getConversationIdForMessage: (messageId: string) => string | undefined;
}

export type ChatStore = ChatState & ChatActions;

function upsertReaction(
  list: NonNullable<ChatMessage["reactions"]>,
  reaction: NonNullable<ChatMessage["reactions"]>[number]
) {
  const existingIdx = list.findIndex(
    (r) => r.userId === reaction.userId && r.emoji === reaction.emoji
  );
  if (existingIdx === -1) return [...list, reaction];
  const copy = [...list];
  copy[existingIdx] = reaction;
  return copy;
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    conversations: {},
    messages: {},
    meta: {},
    typing: {},
    activeConversationId: null,
    messageToConversation: {},

    // Conversation actions
    setConversations: (conversations) => set((state) => {
      const map: Record<string, ConversationSummary> = {};
      conversations.forEach((c) => (map[c.id] = c));
      return { ...state, conversations: map };
    }),

    upsertConversation: (conversation) => set((state) => ({
      ...state,
      conversations: {
        ...state.conversations,
        [conversation.id]: {
          ...state.conversations[conversation.id],
          ...conversation,
        },
      },
    })),

    setActiveConversation: (id) => set((state) => ({
      ...state,
      activeConversationId: id,
    })),

    updateParticipantRead: (conversationId, userId, lastReadAt) => set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv) return state;
      
      const participants = conv.participants.map((p) =>
        p.userId === userId ? { ...p, lastReadAt } : p
      );
      
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [conversationId]: { ...conv, participants },
        },
      };
    }),

    // Message actions
    upsertMessages: (conversationId, messages, prepend = false) => set((state) => {
      const existing = state.messages[conversationId] || [];
      const map = new Map<string, ChatMessage>();
      
      if (prepend) {
        messages.forEach((m) => map.set(m.id, m));
        existing.forEach((m) => map.set(m.id, m));
      } else {
        existing.forEach((m) => map.set(m.id, m));
        messages.forEach((m) => map.set(m.id, m));
      }
      
      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const messageToConversation = { ...state.messageToConversation };
      merged.forEach((m) => (messageToConversation[m.id] = m.conversationId));
      
      // Adjust cursor if older
      const prevEarliest = existing.length ? existing[0].createdAt : undefined;
      const newEarliest = merged.length ? merged[0].createdAt : undefined;
      let meta = state.meta;
      
      if (
        newEarliest &&
        (!prevEarliest || new Date(newEarliest) < new Date(prevEarliest))
      ) {
        const metaEntry = meta[conversationId] || {
          hasMore: true,
          loadingOlder: false,
        };
        const prevCursor = metaEntry.nextCursor;
        if (!prevCursor || new Date(newEarliest) < new Date(prevCursor)) {
          meta = {
            ...meta,
            [conversationId]: { ...metaEntry, nextCursor: newEarliest },
          };
        }
      }
      
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: merged },
        messageToConversation,
        meta,
      };
    }),

    updateMessage: (message) => set((state) => {
      const list = state.messages[message.conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [message.conversationId]: list.map((m) =>
            m.id === message.id ? { ...m, ...message } : m
          ),
        },
      };
    }),

    deleteMessage: (conversationId, messageId) => set((state) => {
      const list = state.messages[conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: list.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, content: "" } : m
          ),
        },
      };
    }),

    confirmMessage: (tempId, realMessage) => set((state) => {
      const list = state.messages[realMessage.conversationId] || [];
      const merged = [
        ...list.filter((m) => m.id !== tempId && m.id !== realMessage.id),
        realMessage,
      ].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      return {
        ...state,
        messages: { ...state.messages, [realMessage.conversationId]: merged },
        messageToConversation: {
          ...state.messageToConversation,
          [realMessage.id]: realMessage.conversationId,
        },
      };
    }),

    markMessageError: (tempId, error) => set((state) => {
      const convId = state.messageToConversation[tempId];
      if (!convId) return state;
      
      const newList = state.messages[convId].map((m) =>
        m.id === tempId ? { ...m, _error: error, _optimistic: true } : m
      );
      
      return { ...state, messages: { ...state.messages, [convId]: newList } };
    }),

    resetMessagePending: (id) => set((state) => {
      const convId = state.messageToConversation[id];
      if (!convId) return state;
      
      const newList = state.messages[convId].map((m) =>
        m.id === id ? { ...m, _error: undefined } : m
      );
      
      return { ...state, messages: { ...state.messages, [convId]: newList } };
    }),

    // Reaction actions
    updateMessageReactions: (conversationId, messageId, reactions) => set((state) => {
      const list = state.messages[conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: list.map((m) =>
            m.id === messageId ? { ...m, reactions } : m
          ),
        },
      };
    }),

    addMessageReaction: (conversationId, messageId, reaction) => set((state) => {
      const list = state.messages[conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: list.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: upsertReaction(m.reactions || [], reaction),
                }
              : m
          ),
        },
      };
    }),

    removeMessageReaction: (conversationId, messageId, userId, emoji) => set((state) => {
      const list = state.messages[conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: list.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: (m.reactions || []).filter(
                    (r) => !(r.userId === userId && r.emoji === emoji)
                  ),
                }
              : m
          ),
        },
      };
    }),

    // Meta actions
    updateMeta: (conversationId, patch) => set((state) => {
      const existing = state.meta[conversationId] || {
        hasMore: true,
        loadingOlder: false,
        nextCursor: undefined,
      };
      
      return {
        ...state,
        meta: {
          ...state.meta,
          [conversationId]: { ...existing, ...patch },
        },
      };
    }),

    // Typing actions
    setTyping: (conversationId, userId, isTyping) => set((state) => {
      const convTyping = { ...state.typing[conversationId] };
      if (isTyping) convTyping[userId] = Date.now();
      else delete convTyping[userId];
      
      return {
        ...state,
        typing: { ...state.typing, [conversationId]: convTyping },
      };
    }),

    // Utility actions
    getConversationIdForMessage: (messageId) => {
      return get().messageToConversation[messageId];
    },
  }))
);