"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useChatActions, useActiveConversationId, useMessagesForConversation } from "./store/selectors";
import { ChatEvents } from "./events";
import { MessageStatus } from "./types";
import { useMessageEventsZustand } from "./socket/useMessageEventsZustand";
import { useConversationEventsZustand } from "./socket/useConversationEventsZustand";
import { useReactionEventsZustand } from "./socket/useReactionEventsZustand";
import { useParticipantEventsZustand } from "./socket/useParticipantEventsZustand";
import { useTypingEventsZustand } from "./socket/useTypingEventsZustand";
import { emit } from "./socket/useSocketCore";
import { getSocket } from "./socketClient";

// Zustand-based chat socket hook for better performance
export function useChatSocketZustand() {
  const { user } = useAuth();
  const chatActions = useChatActions();
  const activeConversationId = useActiveConversationId();
  const enabled = !!user;

  // Connect listener to request conversation list
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    const onConnect = () => emit(ChatEvents.CONVERSATION_LIST);
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [enabled]);

  // Sub modules
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    loadMessages,
    loadOlder,
  } = useMessageEventsZustand(enabled);
  const { createConversation, updateConversationTitle } =
    useConversationEventsZustand(enabled);
  const { addReaction, removeReaction } = useReactionEventsZustand(enabled);
  const { emitTyping } = useTypingEventsZustand(enabled);
  useParticipantEventsZustand(enabled);

  // Lifecycle: join & initial load once
  const lastConvRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const messages = useMessagesForConversation(activeConversationId);
  
  useEffect(() => {
    if (!enabled) return;
    const cid = activeConversationId;
    if (!cid) return;
    if (lastConvRef.current === cid) return;
    if (!joinedRoomsRef.current.has(cid)) {
      emit(ChatEvents.ROOM_JOIN, { conversationId: cid });
      joinedRoomsRef.current.add(cid);
    }
    if (!messages || messages.length === 0) {
      loadMessages(cid);
    }
    const toRead = (messages || [])
      .filter((m) => m.senderId !== user?.id && m.status !== MessageStatus.READ)
      .map((m) => m.id);
    if (toRead.length) {
      emit(ChatEvents.MESSAGE_READ, {
        conversationId: cid,
        messageIds: toRead,
      });
    }
    lastConvRef.current = cid;
  }, [activeConversationId, enabled, messages, user?.id, loadMessages]);

  return {
    sendMessage,
    loadMessages,
    loadOlder,
    joinConversation: (conversationId: string) =>
      emit(ChatEvents.ROOM_JOIN, { conversationId }),
    createConversation,
    editMessage,
    deleteMessage,
    updateConversationTitle,
    addReaction,
    removeReaction,
    resendMessage,
    emitTyping,
  };
}