"use client";
import { useCallback } from "react";
import { useAuth } from "../../providers/AuthProvider";
import { useChatActions, useActiveConversationId } from "../store/selectors";
import { ChatEvents } from "../events";
import { MessageStatus, MessageType } from "../types";
import type { ChatMessage } from "../socketClient";
import { useSocketEvent, emit } from "./useSocketCore";

interface MessageListPayload {
  conversationId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
  direction?: "initial" | "older";
}

export function useMessageEventsZustand(enabled: boolean) {
  const { user } = useAuth();
  const chatActions = useChatActions();
  const activeConversationId = useActiveConversationId();

  // message.list
  useSocketEvent<MessageListPayload>(
    ChatEvents.MESSAGE_LIST,
    (payload) => {
      const isPrepend = payload.direction === "older";
      chatActions.upsertMessages(payload.conversationId, payload.messages, isPrepend);
      chatActions.updateMeta(payload.conversationId, {
        hasMore: payload.hasMore,
        nextCursor: payload.nextCursor ?? null,
        loadingOlder: false,
      });
      // Deliver messages not authored by us
      const toDeliver = payload.messages
        .filter(
          (m) => m.senderId !== user?.id && m.status === MessageStatus.SENT
        )
        .map((m) => m.id);
      if (toDeliver.length) {
        emit(ChatEvents.MESSAGE_DELIVERED, {
          conversationId: payload.conversationId,
          messageIds: toDeliver,
        });
      }
      if (activeConversationId === payload.conversationId) {
        const toRead = payload.messages
          .filter(
            (m) => m.senderId !== user?.id && m.status !== MessageStatus.READ
          )
          .map((m) => m.id);
        if (toRead.length) {
          emit(ChatEvents.MESSAGE_READ, {
            conversationId: payload.conversationId,
            messageIds: toRead,
          });
        }
      }
    },
    enabled
  );

  // message.sent (renamed from message.upsert)
  useSocketEvent<ChatMessage>(
    ChatEvents.MESSAGE_SENT,
    (message) => {
      chatActions.upsertMessages(message.conversationId, [message]);
      // Immediately deliver messages not from us
      if (message.senderId !== user?.id && message.status === MessageStatus.SENT) {
        emit(ChatEvents.MESSAGE_DELIVERED, {
          conversationId: message.conversationId,
          messageIds: [message.id],
        });
      }
      // Mark as read if it's in the active conversation and not from us
      if (
        activeConversationId === message.conversationId &&
        message.senderId !== user?.id &&
        message.status !== MessageStatus.READ
      ) {
        emit(ChatEvents.MESSAGE_READ, {
          conversationId: message.conversationId,
          messageIds: [message.id],
        });
      }
    },
    enabled
  );

  // message.updated
  useSocketEvent<ChatMessage>(
    ChatEvents.MESSAGE_UPDATED,
    (message) => {
      chatActions.updateMessage(message);
    },
    enabled
  );

  // message.deleted
  useSocketEvent<{ conversationId: string; messageId: string }>(
    ChatEvents.MESSAGE_DELETED,
    ({ conversationId, messageId }) => {
      chatActions.deleteMessage(conversationId, messageId);
    },
    enabled
  );

  // message.error
  useSocketEvent<{ messageId: string; error: string }>(
    ChatEvents.MESSAGE_ERROR,
    ({ messageId, error }) => {
      chatActions.markMessageError(messageId, error);
    },
    enabled
  );

  // Actions
  const sendMessage = useCallback(
    (conversationId: string, content: string, type: MessageType = MessageType.TEXT) => {
      if (!user) return;
      
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        content,
        type,
        status: MessageStatus.SENDING,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        sender: { id: user.id, email: user.email, name: user.name },
        _optimistic: true,
      };
      
      chatActions.upsertMessages(conversationId, [optimisticMessage]);
      emit(ChatEvents.MESSAGE_SEND, { conversationId, content, type, tempId });
    },
    [user, chatActions]
  );

  const editMessage = useCallback(
    (conversationId: string, messageId: string, content: string) => {
      emit(ChatEvents.MESSAGE_EDIT, { conversationId, messageId, content });
    },
    []
  );

  const deleteMessage = useCallback(
    (conversationId: string, messageId: string) => {
      emit(ChatEvents.MESSAGE_DELETE, { conversationId, messageId });
    },
    []
  );

  const resendMessage = useCallback(
    (messageId: string) => {
      chatActions.resetMessagePending(messageId);
      const conversationId = chatActions.getConversationIdForMessage(messageId);
      if (!conversationId) return;
      emit(ChatEvents.MESSAGE_SEND, { conversationId, messageId });
    },
    [chatActions]
  );

  const loadMessages = useCallback(
    (conversationId: string) => {
      chatActions.updateMeta(conversationId, { loadingOlder: false });
      emit(ChatEvents.MESSAGE_LIST, { conversationId });
    },
    [chatActions]
  );

  const loadOlder = useCallback(
    (conversationId: string) => {
      chatActions.updateMeta(conversationId, { loadingOlder: true });
      emit(ChatEvents.MESSAGE_LIST, { conversationId, direction: "older" });
    },
    [chatActions]
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    loadMessages,
    loadOlder,
  };
}