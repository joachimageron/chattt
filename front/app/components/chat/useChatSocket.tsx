"use client";
import { useEffect, useRef, useCallback } from "react";
import { getSocket, ChatMessage } from "./socketClient";
import { MessageStatus, MessageType, ConversationSummary } from "./types";
import { useAuth } from "../providers/AuthProvider";
import { useChat } from "./ChatContext";

export function useChatSocket() {
  const { user } = useAuth();
  const chat = useChat();
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("conversation.list");
    };
    const onError = (err: unknown) => {
      console.error("Socket error", err);
    };
    const onConversationList = (payload: {
      conversations: ConversationSummary[];
    }) => {
      chat.setConversations(payload.conversations);
    };
    const onMessageNew = (msg: ChatMessage) => {
      chat.upsertMessages(msg.conversationId, [msg]);
    };
    const onMessageSent = ({
      tempId,
      message,
    }: {
      tempId?: string;
      message: ChatMessage;
    }) => {
      if (tempId) chat.confirmMessage(tempId, message);
      else chat.upsertMessages(message.conversationId, [message]);
    };
    const onMessageUpdated = ({ message }: { message: ChatMessage }) => {
      chat.updateMessage(message);
    };
    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      const convId = chat.activeConversationId; // fallback
      if (convId) chat.deleteMessage(convId, messageId);
    };

    socket.on("connect", onConnect);
    socket.on("error", onError);
    socket.on("conversation.list", onConversationList);
    socket.on("message.new", onMessageNew);
    socket.on("message.sent", onMessageSent);
    socket.on("message.updated", onMessageUpdated);
    socket.on("message.deleted", onMessageDeleted);

    return () => {
      socket.off("connect", onConnect);
      socket.off("error", onError);
      socket.off("conversation.list", onConversationList);
      socket.off("message.new", onMessageNew);
      socket.off("message.sent", onMessageSent);
      socket.off("message.updated", onMessageUpdated);
      socket.off("message.deleted", onMessageDeleted);
    };
  }, [user, chat]);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!socketRef.current || !user) return;
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
      };
      chat.upsertMessages(conversationId, [optimistic]);
      socketRef.current.emit("message.send", {
        conversationId,
        content,
        tempId,
        type: MessageType.TEXT,
      });
    },
    [user, chat]
  );

  const loadMessages = useCallback(
    (conversationId: string, before?: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("message.load", {
        conversationId,
        before,
        limit: 30,
      });
    },
    []
  );

  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("room.join", { conversationId });
  }, []);

  return { sendMessage, loadMessages, joinConversation };
}
