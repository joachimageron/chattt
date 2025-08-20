"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { ChatMessage } from "./socketClient";
import { ConversationSummary } from "./types";

function upsertReaction(
  list: NonNullable<import("./socketClient").ChatMessage["reactions"]>,
  reaction: NonNullable<
    import("./socketClient").ChatMessage["reactions"]
  >[number]
) {
  const existingIdx = list.findIndex(
    (r) => r.userId === reaction.userId && r.emoji === reaction.emoji
  );
  if (existingIdx === -1) return [...list, reaction];
  const copy = [...list];
  copy[existingIdx] = reaction; // update timestamp if changed
  return copy;
}

interface ChatContextValue {
  conversations: Record<string, ConversationSummary>;
  messages: Record<string, ChatMessage[]>;
  meta: Record<
    string,
    { hasMore: boolean; loadingOlder: boolean; nextCursor?: string | null }
  >;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  setConversations: (convs: ConversationSummary[]) => void;
  upsertConversation: (c: ConversationSummary) => void;
  updateParticipantRead: (
    conversationId: string,
    userId: string,
    lastReadAt: string | undefined
  ) => void;
  upsertMessages: (
    conversationId: string,
    msgs: ChatMessage[],
    prepend?: boolean
  ) => void;
  updateMessage: (msg: ChatMessage) => void;
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
  deleteMessage: (conversationId: string, messageId: string) => void;
  confirmMessage: (tempId: string, real: ChatMessage) => void;
  markMessageError: (tempId: string, error: string) => void;
  resetMessagePending: (id: string) => void;
  setHasMore: (conversationId: string, hasMore: boolean) => void;
  setLoadingOlder: (conversationId: string, loading: boolean) => void;
  setNextCursor: (
    conversationId: string,
    cursor: string | null | undefined
  ) => void;
  typing: Record<string, Record<string, number>>; // conversationId -> userId -> last activity epoch ms
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversationsState] = useState<
    Record<string, ConversationSummary>
  >({});
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [meta, setMeta] = useState<
    Record<
      string,
      { hasMore: boolean; loadingOlder: boolean; nextCursor?: string | null }
    >
  >({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  // Typing state map
  const [typingState, setTypingState] = useState<
    Record<string, Record<string, number>>
  >({});

  const setConversations = useCallback((convs: ConversationSummary[]) => {
    setConversationsState(
      convs.reduce<Record<string, ConversationSummary>>((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {})
    );
  }, []);

  const upsertMessages = useCallback(
    (conversationId: string, msgs: ChatMessage[], prepend?: boolean) => {
      setMessages((prev) => {
        const existing = prev[conversationId] || [];
        const prevEarliest = existing.length
          ? existing[0].createdAt
          : undefined;
        const map = new Map<string, ChatMessage>();
        if (prepend) {
          msgs.forEach((m) => map.set(m.id, m));
          existing.forEach((m) => map.set(m.id, m));
        } else {
          existing.forEach((m) => map.set(m.id, m));
          msgs.forEach((m) => map.set(m.id, m));
        }
        const merged = Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        // Cursor invalidation: if a newly inserted message is older than previous earliest, adjust nextCursor if necessary
        const newEarliest = merged.length ? merged[0].createdAt : undefined;
        if (
          newEarliest &&
          (!prevEarliest || new Date(newEarliest) < new Date(prevEarliest))
        ) {
          setMeta((prevMeta) => {
            const metaEntry = prevMeta[conversationId] || {
              hasMore: true,
              loadingOlder: false,
            };
            const prevCursor = metaEntry.nextCursor;
            if (!prevCursor || new Date(newEarliest) < new Date(prevCursor)) {
              return {
                ...prevMeta,
                [conversationId]: { ...metaEntry, nextCursor: newEarliest },
              };
            }
            return prevMeta;
          });
        }
        return { ...prev, [conversationId]: merged };
      });
    },
    []
  );

  const confirmMessage = useCallback((tempId: string, real: ChatMessage) => {
    setMessages((prev) => {
      const list = prev[real.conversationId] || [];
      const merged = [
        ...list.filter((m) => m.id !== tempId && m.id !== real.id),
        real,
      ];
      merged.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return { ...prev, [real.conversationId]: merged };
    });
  }, []);

  const markMessageError = useCallback((tempId: string, error: string) => {
    setMessages((prev) => {
      const newState: typeof prev = { ...prev };
      for (const [cid, list] of Object.entries(prev)) {
        const idx = list.findIndex((m) => m.id === tempId);
        if (idx !== -1) {
          const copy = [...list];
          copy[idx] = { ...copy[idx], _error: error, _optimistic: true };
          newState[cid] = copy;
          break;
        }
      }
      return newState;
    });
  }, []);

  const resetMessagePending = useCallback((id: string) => {
    setMessages((prev) => {
      const newState: typeof prev = { ...prev };
      for (const [cid, list] of Object.entries(prev)) {
        const idx = list.findIndex((m) => m.id === id);
        if (idx !== -1) {
          const copy = [...list];
          copy[idx] = { ...copy[idx], _error: undefined };
          newState[cid] = copy;
          break;
        }
      }
      return newState;
    });
  }, []);

  const setHasMore = useCallback((conversationId: string, hasMore: boolean) => {
    setMeta((prev) => ({
      ...prev,
      [conversationId]: {
        ...(prev[conversationId] || { loadingOlder: false }),
        hasMore,
      },
    }));
  }, []);

  const setLoadingOlder = useCallback(
    (conversationId: string, loading: boolean) => {
      setMeta((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || { hasMore: true }),
          loadingOlder: loading,
        },
      }));
    },
    []
  );

  const setNextCursor = useCallback(
    (conversationId: string, cursor: string | null | undefined) => {
      setMeta((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || { hasMore: true, loadingOlder: false }),
          nextCursor: cursor ?? null,
        },
      }));
    },
    []
  );

  const updateMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const list = prev[msg.conversationId] || [];
      return {
        ...prev,
        [msg.conversationId]: list.map((m) =>
          m.id === msg.id ? { ...m, ...msg } : m
        ),
      };
    });
  }, []);

  const updateMessageReactions = useCallback(
    (
      conversationId: string,
      messageId: string,
      reactions: ChatMessage["reactions"]
    ) => {
      setMessages((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            m.id === messageId ? { ...m, reactions } : m
          ),
        };
      });
    },
    []
  );

  const addMessageReaction = useCallback(
    (
      conversationId: string,
      messageId: string,
      reaction: NonNullable<ChatMessage["reactions"]>[number]
    ) => {
      setMessages((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: upsertReaction(m.reactions || [], reaction),
                }
              : m
          ),
        };
      });
    },
    []
  );

  const removeMessageReaction = useCallback(
    (
      conversationId: string,
      messageId: string,
      userId: string,
      emoji: string
    ) => {
      setMessages((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
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
        };
      });
    },
    []
  );

  const deleteMessage = useCallback(
    (conversationId: string, messageId: string) => {
      setMessages((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, content: "" } : m
          ),
        };
      });
    },
    []
  );

  const upsertConversation = useCallback((c: ConversationSummary) => {
    setConversationsState((prev) => ({
      ...prev,
      [c.id]: { ...prev[c.id], ...c },
    }));
  }, []);

  const updateParticipantRead = useCallback(
    (
      conversationId: string,
      userId: string,
      lastReadAt: string | undefined
    ) => {
      setConversationsState((prev) => {
        const conv = prev[conversationId];
        if (!conv) return prev;
        const participants = conv.participants.map((p) =>
          p.userId === userId ? { ...p, lastReadAt } : p
        );
        return { ...prev, [conversationId]: { ...conv, participants } };
      });
    },
    []
  );

  const value: ChatContextValue = useMemo(
    () => ({
      conversations,
      messages,
      meta,
      activeConversationId,
      setActiveConversation: setActiveConversationId,
      setConversations,
      upsertConversation,
      upsertMessages,
      updateMessage,
      updateMessageReactions,
      addMessageReaction,
      removeMessageReaction,
      deleteMessage,
      confirmMessage,
      markMessageError,
      resetMessagePending,
      setHasMore,
      setLoadingOlder,
      setNextCursor,
      updateParticipantRead,
      typing: typingState,
      setTyping: (
        conversationId: string,
        userId: string,
        isTyping: boolean
      ) => {
        setTypingState((prev) => {
          const existing = prev[conversationId];
          const conv = existing ? { ...existing } : {};
          if (isTyping) {
            conv[userId] = Date.now();
          } else {
            delete conv[userId];
          }
          return { ...prev, [conversationId]: conv };
        });
      },
    }),
    [
      conversations,
      messages,
      meta,
      activeConversationId,
      setConversations,
      upsertConversation,
      upsertMessages,
      updateMessage,
      updateMessageReactions,
      addMessageReaction,
      removeMessageReaction,
      deleteMessage,
      confirmMessage,
      markMessageError,
      resetMessagePending,
      setHasMore,
      setLoadingOlder,
      setNextCursor,
      updateParticipantRead,
      typingState,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
