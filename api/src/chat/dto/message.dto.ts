import { MessageStatus, MessageType } from '../entities/message.entity';

export interface UserDto {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: Date | string;
}

export interface ReactionDto {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date | string;
  user?: UserDto;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  deliveredAt?: Date | string;
  readAt?: Date | string;
  editedAt?: Date | string;
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  sender?: UserDto;
  reactions?: ReactionDto[];
}

export interface ParticipantDto {
  userId: string;
  lastReadAt?: Date | string;
  user?: UserDto;
}

export interface ConversationDto {
  id: string;
  type: string; // ConversationType as string to avoid circular import here
  title?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  participants: ParticipantDto[];
  lastMessage?: MessageDto;
}
