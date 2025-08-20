"use client";
import { useCallback } from "react";
import { useChat } from "../ChatContext";
import { useSocketEvent, emit } from "./useSocketCore";
import { ChatEvents } from "../events";

export function useReactionEvents(enabled: boolean) {
  const chat = useChat();
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
      let convId = chat.activeConversationId;
      if (!convId) {
        for (const [cid, list] of Object.entries(chat.messages)) {
          if (list.some((m) => m.id === p.messageId)) {
            convId = cid;
            break;
          }
        }
      }
      if (convId) chat.addMessageReaction(convId, p.messageId, p.reaction);
    },
    enabled
  );

  useSocketEvent<ReactionRemoved>(
    ChatEvents.REACTION_REMOVED,
    (p) => {
      let convId = chat.activeConversationId;
      if (!convId) {
        for (const [cid, list] of Object.entries(chat.messages)) {
          if (list.some((m) => m.id === p.messageId)) {
            convId = cid;
            break;
          }
        }
      }
      if (convId)
        chat.removeMessageReaction(
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
