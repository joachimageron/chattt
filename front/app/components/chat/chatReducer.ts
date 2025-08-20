import { ChatMessage } from "./socketClient";
import { ConversationSummary } from "./types";

export interface ChatMetaEntry {
  hasMore: boolean;
  loadingOlder: boolean;
  nextCursor?: string | null;
}

export interface ChatState {
  conversations: Record<string, ConversationSummary>;
  messages: Record<string, ChatMessage[]>; // kept for backward compatibility
  meta: Record<string, ChatMetaEntry>;
  typing: Record<string, Record<string, number>>; // conversationId -> userId -> last activity
  activeConversationId: string | null;
  messageToConversation: Record<string, string>; // index messageId -> conversationId
}

export const initialChatState: ChatState = {
  conversations: {},
  messages: {},
  meta: {},
  typing: {},
  activeConversationId: null,
  messageToConversation: {},
};

// Actions
export type ChatAction =
  | { type: "SET_CONVERSATIONS"; conversations: ConversationSummary[] }
  | { type: "UPSERT_CONVERSATION"; conversation: ConversationSummary }
  | {
      type: "UPSERT_MESSAGES";
      conversationId: string;
      messages: ChatMessage[];
      prepend?: boolean;
    }
  | { type: "CONFIRM_MESSAGE"; tempId: string; message: ChatMessage }
  | { type: "MARK_MESSAGE_ERROR"; tempId: string; error: string }
  | { type: "RESET_MESSAGE_PENDING"; id: string }
  | { type: "UPDATE_MESSAGE"; message: ChatMessage }
  | { type: "DELETE_MESSAGE"; conversationId: string; messageId: string }
  | { type: "SET_HAS_MORE"; conversationId: string; hasMore: boolean }
  | { type: "SET_LOADING_OLDER"; conversationId: string; loadingOlder: boolean }
  | {
      type: "SET_NEXT_CURSOR";
      conversationId: string;
      cursor: string | null | undefined;
    }
  | {
      type: "UPDATE_PARTICIPANT_READ";
      conversationId: string;
      userId: string;
      lastReadAt?: string;
    }
  | { type: "SET_ACTIVE_CONVERSATION"; id: string | null }
  | {
      type: "SET_TYPING";
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }
  | {
      type: "UPDATE_MESSAGE_REACTIONS";
      conversationId: string;
      messageId: string;
      reactions: ChatMessage["reactions"];
    }
  | {
      type: "ADD_MESSAGE_REACTION";
      conversationId: string;
      messageId: string;
      reaction: NonNullable<ChatMessage["reactions"]>[number];
    }
  | {
      type: "REMOVE_MESSAGE_REACTION";
      conversationId: string;
      messageId: string;
      userId: string;
      emoji: string;
    };

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

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_CONVERSATIONS": {
      const map: Record<string, ConversationSummary> = {};
      action.conversations.forEach((c) => (map[c.id] = c));
      return { ...state, conversations: map };
    }
    case "UPSERT_CONVERSATION": {
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.conversation.id]: {
            ...state.conversations[action.conversation.id],
            ...action.conversation,
          },
        },
      };
    }
    case "UPSERT_MESSAGES": {
      const existing = state.messages[action.conversationId] || [];
      const map = new Map<string, ChatMessage>();
      if (action.prepend) {
        action.messages.forEach((m) => map.set(m.id, m));
        existing.forEach((m) => map.set(m.id, m));
      } else {
        existing.forEach((m) => map.set(m.id, m));
        action.messages.forEach((m) => map.set(m.id, m));
      }
      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const messageToConversation = { ...state.messageToConversation };
      merged.forEach((m) => (messageToConversation[m.id] = m.conversationId));
      // adjust cursor if older
      const prevEarliest = existing.length ? existing[0].createdAt : undefined;
      const newEarliest = merged.length ? merged[0].createdAt : undefined;
      let meta = state.meta;
      if (
        newEarliest &&
        (!prevEarliest || new Date(newEarliest) < new Date(prevEarliest))
      ) {
        const metaEntry = meta[action.conversationId] || {
          hasMore: true,
          loadingOlder: false,
        };
        const prevCursor = metaEntry.nextCursor;
        if (!prevCursor || new Date(newEarliest) < new Date(prevCursor)) {
          meta = {
            ...meta,
            [action.conversationId]: { ...metaEntry, nextCursor: newEarliest },
          };
        }
      }
      return {
        ...state,
        messages: { ...state.messages, [action.conversationId]: merged },
        messageToConversation,
        meta,
      };
    }
    case "CONFIRM_MESSAGE": {
      const { tempId, message } = action;
      const list = state.messages[message.conversationId] || [];
      const merged = [
        ...list.filter((m) => m.id !== tempId && m.id !== message.id),
        message,
      ].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return {
        ...state,
        messages: { ...state.messages, [message.conversationId]: merged },
        messageToConversation: {
          ...state.messageToConversation,
          [message.id]: message.conversationId,
        },
      };
    }
    case "MARK_MESSAGE_ERROR": {
      const { tempId, error } = action;
      const messageToConversation = { ...state.messageToConversation };
      // scan minimal (using index if exists)
      const convId =
        messageToConversation[tempId] ||
        Object.entries(state.messages).find(([, list]) =>
          list.some((m) => m.id === tempId)
        )?.[0];
      if (!convId) return state;
      const newList = state.messages[convId].map((m) =>
        m.id === tempId ? { ...m, _error: error, _optimistic: true } : m
      );
      return { ...state, messages: { ...state.messages, [convId]: newList } };
    }
    case "RESET_MESSAGE_PENDING": {
      const { id } = action;
      const convId =
        state.messageToConversation[id] ||
        Object.entries(state.messages).find(([, list]) =>
          list.some((m) => m.id === id)
        )?.[0];
      if (!convId) return state;
      const newList = state.messages[convId].map((m) =>
        m.id === id ? { ...m, _error: undefined } : m
      );
      return { ...state, messages: { ...state.messages, [convId]: newList } };
    }
    case "UPDATE_MESSAGE": {
      const { message } = action;
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
    }
    case "DELETE_MESSAGE": {
      const { conversationId, messageId } = action;
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
    }
    case "SET_HAS_MORE": {
      const { conversationId, hasMore } = action;
      const entry = state.meta[conversationId] || {
        loadingOlder: false,
        hasMore: true,
      };
      return {
        ...state,
        meta: {
          ...state.meta,
          [conversationId]: { ...entry, hasMore },
        },
      };
    }
    case "SET_LOADING_OLDER": {
      const { conversationId, loadingOlder } = action;
      const entry = state.meta[conversationId] || {
        hasMore: true,
        loadingOlder: false,
      };
      return {
        ...state,
        meta: {
          ...state.meta,
          [conversationId]: { ...entry, loadingOlder },
        },
      };
    }
    case "SET_NEXT_CURSOR": {
      const { conversationId, cursor } = action;
      const entry = state.meta[conversationId] || {
        hasMore: true,
        loadingOlder: false,
      };
      return {
        ...state,
        meta: {
          ...state.meta,
          [conversationId]: { ...entry, nextCursor: cursor ?? null },
        },
      };
    }
    case "UPDATE_PARTICIPANT_READ": {
      const { conversationId, userId, lastReadAt } = action;
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
    }
    case "SET_ACTIVE_CONVERSATION": {
      return { ...state, activeConversationId: action.id };
    }
    case "SET_TYPING": {
      const { conversationId, userId, isTyping } = action;
      const convTyping = { ...state.typing[conversationId] };
      if (isTyping) convTyping[userId] = Date.now();
      else delete convTyping[userId];
      return {
        ...state,
        typing: { ...state.typing, [conversationId]: convTyping },
      };
    }
    case "UPDATE_MESSAGE_REACTIONS": {
      const { conversationId, messageId, reactions } = action;
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
    }
    case "ADD_MESSAGE_REACTION": {
      const { conversationId, messageId, reaction } = action;
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
    }
    case "REMOVE_MESSAGE_REACTION": {
      const { conversationId, messageId, userId, emoji } = action;
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
    }
    default:
      return state;
  }
}
