import { io, Socket } from "socket.io-client";
import { MessageStatus, MessageType } from "./types";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(
      `${process.env.NEXT_PUBLIC_API_WS_URL || "http://localhost:4000"}/chat`,
      {
        withCredentials: true,
        transports: ["websocket"],
      }
    );
  }
  return socket;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  deliveredAt?: string;
  readAt?: string;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  sender?: { id: string; email: string; name?: string | null };
  reactions?: {
    id: string;
    messageId: string;
    userId: string;
    emoji: string;
    createdAt: string;
  }[];
  // Client-only flags for optimistic & error states
  _optimistic?: boolean;
  _error?: string;
}
