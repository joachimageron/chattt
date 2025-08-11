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

interface ChatContextValue {
  conversations: Record<string, ConversationSummary>;
  messages: Record<string, ChatMessage[]>;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  setConversations: (convs: ConversationSummary[]) => void;
  upsertConversation: (c: ConversationSummary) => void;
  upsertMessages: (
    conversationId: string,
    msgs: ChatMessage[],
    prepend?: boolean
  ) => void;
  updateMessage: (msg: ChatMessage) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  confirmMessage: (tempId: string, real: ChatMessage) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversationsState] = useState<
    Record<string, ConversationSummary>
  >({});
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

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
        const merged = prepend
          ? [...msgs, ...existing]
          : [
              ...existing,
              ...msgs.filter((m) => !existing.find((e) => e.id === m.id)),
            ];
        merged.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
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

  const value: ChatContextValue = useMemo(
    () => ({
      conversations,
      messages,
      activeConversationId,
      setActiveConversation: setActiveConversationId,
      setConversations,
      upsertConversation,
      upsertMessages,
      updateMessage,
      deleteMessage,
      confirmMessage,
    }),
    [
      conversations,
      messages,
      activeConversationId,
      setConversations,
      upsertConversation,
      upsertMessages,
      updateMessage,
      deleteMessage,
      confirmMessage,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
