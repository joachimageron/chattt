"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useChat } from "./ChatContext";
import { ChatEvents } from "./events";
import { MessageStatus } from "./types";
import { useMessageEvents } from "./socket/useMessageEvents";
import { useConversationEvents } from "./socket/useConversationEvents";
import { useReactionEvents } from "./socket/useReactionEvents";
import { useParticipantEvents } from "./socket/useParticipantEvents";
import { useTypingEvents } from "./socket/useTypingEvents";
import { emit } from "./socket/useSocketCore";
import { getSocket } from "./socketClient";

// Backward-compatible aggregated chat socket hook
export function useChatSocket() {
  const { user } = useAuth();
  const chat = useChat();
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
  } = useMessageEvents(enabled);
  const { createConversation, updateConversationTitle } =
    useConversationEvents(enabled);
  const { addReaction, removeReaction } = useReactionEvents(enabled);
  const { emitTyping } = useTypingEvents(enabled);
  useParticipantEvents(enabled);

  // Lifecycle: join & initial load once
  const lastConvRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!enabled) return;
    const cid = chat.activeConversationId;
    if (!cid) return;
    if (lastConvRef.current === cid) return;
    if (!joinedRoomsRef.current.has(cid)) {
      emit(ChatEvents.ROOM_JOIN, { conversationId: cid });
      joinedRoomsRef.current.add(cid);
    }
    if (!chat.messages[cid] || chat.messages[cid].length === 0) {
      loadMessages(cid);
    }
    const list = chat.messages[cid] || [];
    const toRead = list
      .filter((m) => m.senderId !== user?.id && m.status !== MessageStatus.READ)
      .map((m) => m.id);
    if (toRead.length) {
      emit(ChatEvents.MESSAGE_READ, {
        conversationId: cid,
        messageIds: toRead,
      });
    }
    lastConvRef.current = cid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.activeConversationId, enabled]);

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
