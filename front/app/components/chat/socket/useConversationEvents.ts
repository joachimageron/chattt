"use client";
import { useCallback } from "react";
import { useChat } from "../ChatContext";
import { useSocketEvent, emit } from "./useSocketCore";
import { ChatEvents } from "../events";
import type { ConversationSummary } from "../types";

export function useConversationEvents(enabled: boolean) {
  const chat = useChat();
  useSocketEvent<{ conversations: ConversationSummary[] }>(
    ChatEvents.CONVERSATION_LIST_DATA,
    (p) => chat.setConversations(p.conversations),
    enabled
  );
  useSocketEvent<{ conversation: ConversationSummary }>(
    ChatEvents.CONVERSATION_CREATED,
    (p) => chat.upsertConversation(p.conversation),
    enabled
  );
  useSocketEvent<{ conversation: ConversationSummary }>(
    ChatEvents.CONVERSATION_UPDATED,
    (p) => chat.upsertConversation(p.conversation),
    enabled
  );

  const createConversation = useCallback(
    (
      participantUserIds: string[],
      title?: string,
      type: "DIRECT" | "GROUP" = "DIRECT"
    ) => {
      emit(ChatEvents.CONVERSATION_CREATE, { participantUserIds, title, type });
    },
    []
  );

  const updateConversationTitle = useCallback(
    (conversationId: string, title: string) => {
      emit(ChatEvents.CONVERSATION_TITLE_UPDATE, { conversationId, title });
    },
    []
  );

  return { createConversation, updateConversationTitle };
}
