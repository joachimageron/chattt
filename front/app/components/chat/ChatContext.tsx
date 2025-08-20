"use client";
import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useReducer,
  useCallback,
} from "react";
import { ChatMessage } from "./socketClient";
import { ConversationSummary } from "./types";
import { chatReducer, initialChatState } from "./chatReducer";

interface ChatContextValue {
  conversations: Record<string, ConversationSummary>;
  messages: Record<string, ChatMessage[]>;
  meta: Record<
    string,
    { hasMore: boolean; loadingOlder: boolean; nextCursor?: string | null }
  >;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  getConversationIdForMessage: (messageId: string) => string | undefined;
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
  updateMeta: (
    conversationId: string,
    patch: Partial<{
      hasMore: boolean;
      loadingOlder: boolean;
      nextCursor?: string | null;
    }>
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
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  // Adapter functions mirroring previous API
  const setConversations = useCallback(
    (convs: ConversationSummary[]) =>
      dispatch({ type: "SET_CONVERSATIONS", conversations: convs }),
    []
  );
  const upsertConversation = useCallback(
    (c: ConversationSummary) =>
      dispatch({ type: "UPSERT_CONVERSATION", conversation: c }),
    []
  );
  const upsertMessages = useCallback(
    (conversationId: string, msgs: ChatMessage[], prepend?: boolean) =>
      dispatch({
        type: "UPSERT_MESSAGES",
        conversationId,
        messages: msgs,
        prepend,
      }),
    []
  );
  const updateMessage = useCallback(
    (msg: ChatMessage) => dispatch({ type: "UPDATE_MESSAGE", message: msg }),
    []
  );
  const updateMessageReactions = useCallback(
    (
      conversationId: string,
      messageId: string,
      reactions: ChatMessage["reactions"]
    ) =>
      dispatch({
        type: "UPDATE_MESSAGE_REACTIONS",
        conversationId,
        messageId,
        reactions,
      }),
    []
  );
  const addMessageReaction = useCallback(
    (
      conversationId: string,
      messageId: string,
      reaction: NonNullable<ChatMessage["reactions"]>[number]
    ) =>
      dispatch({
        type: "ADD_MESSAGE_REACTION",
        conversationId,
        messageId,
        reaction,
      }),
    []
  );
  const removeMessageReaction = useCallback(
    (
      conversationId: string,
      messageId: string,
      userId: string,
      emoji: string
    ) =>
      dispatch({
        type: "REMOVE_MESSAGE_REACTION",
        conversationId,
        messageId,
        userId,
        emoji,
      }),
    []
  );
  const deleteMessage = useCallback(
    (conversationId: string, messageId: string) =>
      dispatch({ type: "DELETE_MESSAGE", conversationId, messageId }),
    []
  );
  const confirmMessage = useCallback(
    (tempId: string, real: ChatMessage) =>
      dispatch({ type: "CONFIRM_MESSAGE", tempId, message: real }),
    []
  );
  const markMessageError = useCallback(
    (tempId: string, error: string) =>
      dispatch({ type: "MARK_MESSAGE_ERROR", tempId, error }),
    []
  );
  const resetMessagePending = useCallback(
    (id: string) => dispatch({ type: "RESET_MESSAGE_PENDING", id }),
    []
  );
  const setHasMore = useCallback(() => {
    throw new Error("setHasMore removed – use updateMeta");
  }, []);
  const setLoadingOlder = useCallback(() => {
    throw new Error("setLoadingOlder removed – use updateMeta");
  }, []);
  const setNextCursor = useCallback(() => {
    throw new Error("setNextCursor removed – use updateMeta");
  }, []);
  const updateMeta = useCallback(
    (
      conversationId: string,
      patch: Partial<{
        hasMore: boolean;
        loadingOlder: boolean;
        nextCursor?: string | null;
      }>
    ) => dispatch({ type: "UPDATE_META", conversationId, patch }),
    []
  );
  const updateParticipantRead = useCallback(
    (conversationId: string, userId: string, lastReadAt: string | undefined) =>
      dispatch({
        type: "UPDATE_PARTICIPANT_READ",
        conversationId,
        userId,
        lastReadAt,
      }),
    []
  );
  const setActiveConversation = useCallback(
    (id: string | null) => dispatch({ type: "SET_ACTIVE_CONVERSATION", id }),
    []
  );
  const setTyping = useCallback(
    (conversationId: string, userId: string, isTyping: boolean) =>
      dispatch({ type: "SET_TYPING", conversationId, userId, isTyping }),
    []
  );

  const value: ChatContextValue = useMemo(
    () => ({
      conversations: state.conversations,
      messages: state.messages,
      meta: state.meta,
      activeConversationId: state.activeConversationId,
      setActiveConversation,
      getConversationIdForMessage: (messageId: string) =>
        state.messageToConversation[messageId],
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
      typing: state.typing,
      setTyping,
      updateMeta,
    }),
    [
      state,
      setActiveConversation,
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
      setTyping,
      updateMeta,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
