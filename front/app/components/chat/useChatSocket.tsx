"use client";
import { useEffect, useRef, useCallback } from "react";
import { addToast } from "@heroui/react";
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
      console.log("[socket] connected");
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
      // Avoid duplicate: if it's our own message, we'll handle via message.sent
      if (msg.senderId === user?.id) return;
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
      // Attempt to find which conversation contains this message (search last loaded conv first)
      let convId = chat.activeConversationId;
      if (!convId) {
        // fallback linear scan (small lists typical in UI state)
        for (const [cid, list] of Object.entries(chat.messages)) {
          if (list.find((m) => m.id === messageId)) {
            convId = cid;
            break;
          }
        }
      }
      if (convId) chat.deleteMessage(convId, messageId);
    };
    const onConversationCreated = (payload: {
      conversation: ConversationSummary;
    }) => {
      chat.upsertConversation(payload.conversation);
    };
    const onConversationUpdated = (payload: {
      conversation: ConversationSummary;
    }) => {
      chat.upsertConversation(payload.conversation);
    };
    const onMessageList = (payload: {
      conversationId: string;
      messages: ChatMessage[];
      hasMore: boolean;
    }) => {
      console.log(
        "[socket] message.list",
        payload.conversationId,
        payload.messages.length
      );
      chat.upsertMessages(payload.conversationId, payload.messages);
    };

    const onMessageError = (payload: { error: string }) => {
      addToast({
        title: "Erreur message",
        description: payload.error,
        color: "danger",
      });
    };

    socket.on("connect", onConnect);
    socket.on("error", onError);
    socket.on("conversation.list", onConversationList);
    socket.on("message.new", onMessageNew);
    socket.on("message.sent", onMessageSent);
    socket.on("message.updated", onMessageUpdated);
    socket.on("message.deleted", onMessageDeleted);
    socket.on("conversation.created", onConversationCreated);
    socket.on("conversation.updated", onConversationUpdated);
    socket.on("message.list", onMessageList);
    socket.on("message.error", onMessageError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("error", onError);
      socket.off("conversation.list", onConversationList);
      socket.off("message.new", onMessageNew);
      socket.off("message.sent", onMessageSent);
      socket.off("message.updated", onMessageUpdated);
      socket.off("message.deleted", onMessageDeleted);
      socket.off("conversation.created", onConversationCreated);
      socket.off("conversation.updated", onConversationUpdated);
      socket.off("message.list", onMessageList);
      socket.off("message.error", onMessageError);
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
        sender: { id: user.id, email: user.email, name: user.name },
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

  const editMessage = useCallback(
    (messageId: string, conversationId: string, content: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("message.edit", {
        messageId,
        conversationId,
        content,
      });
    },
    []
  );

  const deleteMessage = useCallback(
    (messageId: string, conversationId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("message.delete", { messageId, conversationId });
    },
    []
  );

  const createConversation = useCallback(
    (
      participantUserIds: string[],
      title?: string,
      type: "DIRECT" | "GROUP" = "DIRECT"
    ) => {
      if (!socketRef.current) return;
      socketRef.current.emit("conversation.create", {
        participantUserIds,
        title,
        type,
      });
    },
    []
  );

  const updateConversationTitle = useCallback(
    (conversationId: string, title: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("conversation.title.update", {
        conversationId,
        title,
      });
    },
    []
  );

  useEffect(() => {
    if (chat.activeConversationId) {
      joinConversation(chat.activeConversationId);
      loadMessages(chat.activeConversationId);
    }
  }, [chat.activeConversationId, joinConversation, loadMessages]);

  return {
    sendMessage,
    loadMessages,
    joinConversation,
    createConversation,
    editMessage,
    deleteMessage,
    updateConversationTitle,
  };
}
