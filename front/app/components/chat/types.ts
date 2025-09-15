import { ChatMessage } from "./socketClient";
export enum MessageType {
  TEXT = "TEXT",
  FILE = "FILE",
  IMAGE = "IMAGE",
}

export enum MessageStatus {
  SENDING = "SENDING",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
}

export interface ConversationParticipant {
  userId: string;
  lastReadAt?: string;
  // When loaded from conversation list, backend may include the user object
  user?: { id: string; email: string; name?: string | null };
}

export interface ConversationSummary {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string | null;
  participants: ConversationParticipant[];
  // lastMessage summary only (messages loaded separately)
  lastMessage?: ChatMessage;
}
