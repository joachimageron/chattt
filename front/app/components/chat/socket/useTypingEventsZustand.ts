"use client";
import { useSocketEvent, emit } from "./useSocketCore";
import { ChatEvents } from "../events";
import { useChatActions } from "../store/selectors";
import { useAuth } from "../../providers/AuthProvider";

export function useTypingEventsZustand(enabled: boolean) {
  const chatActions = useChatActions();
  const { user } = useAuth();
  
  useSocketEvent<{ conversationId: string; userId: string }>(
    ChatEvents.TYPING_STARTED,
    (p) => {
      if (p.userId !== user?.id)
        chatActions.setTyping(p.conversationId, p.userId, true);
    },
    enabled
  );
  useSocketEvent<{ conversationId: string; userId: string }>(
    ChatEvents.TYPING_STOPPED,
    (p) => {
      if (p.userId !== user?.id)
        chatActions.setTyping(p.conversationId, p.userId, false);
    },
    enabled
  );

  const emitTyping = (conversationId: string, isTyping: boolean) => {
    emit(isTyping ? ChatEvents.TYPING_START : ChatEvents.TYPING_STOP, {
      conversationId,
    });
  };

  return { emitTyping };
}