"use client";
import { useCallback } from "react";
import { useChatActions, useActiveConversationId } from "../store/selectors";
import { useSocketEvent, emit } from "./useSocketCore";
import { ChatEvents } from "../events";

export function useReactionEventsZustand(enabled: boolean) {
  const chatActions = useChatActions();
  const activeConversationId = useActiveConversationId();
  
  type ReactionAdded = {
    messageId: string;
    reaction: {
      id: string;
      messageId: string;
      userId: string;
      emoji: string;
      createdAt: string;
    };
  };
  type ReactionRemoved = {
    messageId: string;
    reaction: { messageId: string; userId: string; emoji: string };
  };

  useSocketEvent<ReactionAdded>(
    ChatEvents.REACTION_ADDED,
    (p) => {
      const convId =
        chatActions.getConversationIdForMessage(p.messageId) ||
        activeConversationId;
      if (convId) chatActions.addMessageReaction(convId, p.messageId, p.reaction);
    },
    enabled
  );

  useSocketEvent<ReactionRemoved>(
    ChatEvents.REACTION_REMOVED,
    (p) => {
      const convId =
        chatActions.getConversationIdForMessage(p.messageId) ||
        activeConversationId;
      if (convId)
        chatActions.removeMessageReaction(
          convId,
          p.messageId,
          p.reaction.userId,
          p.reaction.emoji
        );
    },
    enabled
  );

  const addReaction = useCallback(
    (conversationId: string, messageId: string, emoji: string) => {
      emit(ChatEvents.REACTION_ADD, { conversationId, messageId, emoji });
    },
    []
  );

  const removeReaction = useCallback(
    (conversationId: string, messageId: string, emoji: string) => {
      emit(ChatEvents.REACTION_REMOVE, { conversationId, messageId, emoji });
    },
    []
  );

  return { addReaction, removeReaction };
}