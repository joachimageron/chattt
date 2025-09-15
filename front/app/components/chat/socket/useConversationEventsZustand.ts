"use client";
import { useCallback } from "react";
import { useChatActions } from "../store/selectors";
import { useSocketEvent, emit } from "./useSocketCore";
import { ChatEvents } from "../events";
import type { ConversationSummary } from "../types";

export function useConversationEventsZustand(enabled: boolean) {
  const chatActions = useChatActions();
  
  useSocketEvent<{ conversations: ConversationSummary[] }>(
    ChatEvents.CONVERSATION_LIST_DATA,
    (p) => chatActions.setConversations(p.conversations),
    enabled
  );
  useSocketEvent<{ conversation: ConversationSummary }>(
    ChatEvents.CONVERSATION_CREATED,
    (p) => chatActions.upsertConversation(p.conversation),
    enabled
  );
  useSocketEvent<{ conversation: ConversationSummary }>(
    ChatEvents.CONVERSATION_UPDATED,
    (p) => chatActions.upsertConversation(p.conversation),
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