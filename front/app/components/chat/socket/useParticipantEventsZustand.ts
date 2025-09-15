"use client";
import { useSocketEvent } from "./useSocketCore";
import { ChatEvents } from "../events";
import { useChatActions } from "../store/selectors";

export function useParticipantEventsZustand(enabled: boolean) {
  const chatActions = useChatActions();
  
  useSocketEvent<{
    conversationId: string;
    userId: string;
    lastReadAt?: string;
  }>(
    ChatEvents.PARTICIPANT_READ,
    (p) => chatActions.updateParticipantRead(p.conversationId, p.userId, p.lastReadAt),
    enabled
  );
}