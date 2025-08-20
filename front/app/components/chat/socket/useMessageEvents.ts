"use client";
import { useCallback } from "react";
import { useAuth } from "../../providers/AuthProvider";
import { useChat } from "../ChatContext";
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

export function useMessageEvents(enabled: boolean) {
  const { user } = useAuth();
  const chat = useChat();

  // message.list
  useSocketEvent<MessageListPayload>(
    ChatEvents.MESSAGE_LIST,
    (payload) => {
      const isPrepend = payload.direction === "older";
      chat.upsertMessages(payload.conversationId, payload.messages, isPrepend);
      chat.setHasMore(payload.conversationId, payload.hasMore);
      chat.setNextCursor(payload.conversationId, payload.nextCursor);
      chat.setLoadingOlder(payload.conversationId, false);
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
      if (chat.activeConversationId === payload.conversationId) {
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

  // message.new (from others)
  useSocketEvent<ChatMessage>(
    ChatEvents.MESSAGE_NEW,
    (msg) => {
      if (msg.senderId === user?.id) return; // avoid duplicate self
      chat.upsertMessages(msg.conversationId, [msg]);
      if (chat.activeConversationId === msg.conversationId) {
        emit(ChatEvents.MESSAGE_DELIVERED, {
          conversationId: msg.conversationId,
          messageIds: [msg.id],
        });
        emit(ChatEvents.MESSAGE_READ, {
          conversationId: msg.conversationId,
          messageIds: [msg.id],
        });
      }
    },
    enabled
  );

  // message.sent (optimistic confirmation)
  useSocketEvent<{ tempId?: string; message: ChatMessage }>(
    ChatEvents.MESSAGE_SENT,
    ({ tempId, message }) => {
      if (tempId) chat.confirmMessage(tempId, message);
      else chat.upsertMessages(message.conversationId, [message]);
    },
    enabled
  );

  useSocketEvent<{ message: ChatMessage }>(
    ChatEvents.MESSAGE_UPDATED,
    ({ message }) => chat.updateMessage(message),
    enabled
  );

  useSocketEvent<{ messageId: string }>(
    ChatEvents.MESSAGE_DELETED,
    ({ messageId }) => {
      // naive search, future: index map
      let convId = chat.activeConversationId;
      if (!convId) {
        for (const [cid, list] of Object.entries(chat.messages)) {
          if (list.find((m) => m.id === messageId)) {
            convId = cid;
            break;
          }
        }
      }
      if (convId) chat.deleteMessage(convId, messageId);
    },
    enabled
  );

  useSocketEvent<{
    error: { code: string; message: string; data?: Record<string, unknown> };
  }>(
    ChatEvents.MESSAGE_ERROR,
    ({ error }) => {
      const tempId = (error.data?.tempId as string | undefined) || undefined;
      const msg = error.message || "Erreur message";
      if (tempId) chat.markMessageError(tempId, msg);
    },
    enabled
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!user) return;
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        content,
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: { id: user.id, email: user.email, name: user.name },
        _optimistic: true,
      };
      chat.upsertMessages(conversationId, [optimistic]);
      emit(ChatEvents.MESSAGE_SEND, {
        conversationId,
        content,
        tempId,
        type: MessageType.TEXT,
      });
    },
    [user, chat]
  );

  const editMessage = useCallback(
    (messageId: string, conversationId: string, content: string) => {
      emit(ChatEvents.MESSAGE_EDIT, { messageId, conversationId, content });
    },
    []
  );

  const deleteMessage = useCallback(
    (messageId: string, conversationId: string) => {
      emit(ChatEvents.MESSAGE_DELETE, { messageId, conversationId });
    },
    []
  );

  const resendMessage = useCallback(
    (conversationId: string, tempId: string) => {
      const list = chat.messages[conversationId] || [];
      const msg = list.find((m) => m.id === tempId);
      if (!msg || !msg._error) return;
      chat.resetMessagePending(tempId);
      emit(ChatEvents.MESSAGE_SEND, {
        conversationId,
        content: msg.content,
        tempId,
        type: msg.type,
      });
    },
    [chat]
  );

  const loadMessages = useCallback(
    (conversationId: string, cursor?: string) => {
      emit(ChatEvents.MESSAGE_LOAD, { conversationId, cursor, limit: 30 });
    },
    []
  );

  const loadOlder = useCallback(
    (conversationId: string) => {
      const meta = chat.meta[conversationId];
      if (!meta || !meta.hasMore || meta.loadingOlder) return;
      chat.setLoadingOlder(conversationId, true);
      loadMessages(conversationId, meta.nextCursor || undefined);
    },
    [chat, loadMessages]
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
