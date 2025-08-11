import { ChatMessage } from "./socketClient";
export enum MessageType {
  TEXT = "TEXT",
  FILE = "FILE",
  IMAGE = "IMAGE",
}

export enum MessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
}

export interface ConversationParticipant {
  userId: string;
  lastReadAt?: string;
}

export interface ConversationSummary {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string | null;
  participants: ConversationParticipant[];
  messages?: ChatMessage[];
}
