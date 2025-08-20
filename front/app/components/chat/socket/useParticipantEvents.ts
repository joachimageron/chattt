"use client";
import { useSocketEvent } from "./useSocketCore";
import { ChatEvents } from "../events";
import { useChat } from "../ChatContext";

export function useParticipantEvents(enabled: boolean) {
  const chat = useChat();
  useSocketEvent<{
    conversationId: string;
    userId: string;
    lastReadAt?: string;
  }>(
    ChatEvents.PARTICIPANT_READ,
    (p) => chat.updateParticipantRead(p.conversationId, p.userId, p.lastReadAt),
    enabled
  );
}
