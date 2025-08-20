import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/messageReaction.entity';
import { User } from '../users/entities/user.entity';
import {
  ConversationDto,
  MessageDto,
  ParticipantDto,
  ReactionDto,
  UserDto,
} from './dto/message.dto';

export function toUserDto(user?: User | null): UserDto | undefined {
  if (!user) return undefined;
  const { id, email, name, createdAt } = user;
  return { id, email, name, createdAt };
}

export function toReactionDto(
  r: MessageReaction & { user?: User | null },
): ReactionDto {
  return {
    id: r.id,
    messageId: r.messageId,
    userId: r.userId,
    emoji: r.emoji,
    createdAt: r.createdAt,
    user: toUserDto(r.user),
  };
}

export function toMessageDto(
  message: Message & {
    sender?: User | null;
    reactions?: (MessageReaction & { user?: User | null })[];
  },
): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    type: message.type,
    status: message.status,
    deliveredAt: message.deliveredAt,
    readAt: message.readAt,
    editedAt: message.editedAt,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    sender: toUserDto(message.sender),
    reactions: (message.reactions || []).map(toReactionDto),
  };
}

export function toParticipantDto(
  p: ConversationParticipant & { user?: User | null },
): ParticipantDto {
  return {
    userId: p.userId,
    lastReadAt: p.lastReadAt,
    user: toUserDto(p.user),
  };
}

export function toConversationDto(
  convo: Conversation & {
    messages?: Message[];
    participants?: (ConversationParticipant & { user?: User | null })[];
  },
): ConversationDto {
  let lastMessage: Message | undefined;
  if (convo.messages && convo.messages.length) {
    if (convo.messages.length === 1) lastMessage = convo.messages[0];
    else
      lastMessage = [...convo.messages].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];
  }
  return {
    id: convo.id,
    type: convo.type,
    title: convo.title,
    createdAt: convo.createdAt,
    updatedAt: convo.updatedAt,
    participants: (convo.participants || []).map(toParticipantDto),
    lastMessage: lastMessage
      ? toMessageDto(lastMessage as Message & { sender?: User | null })
      : undefined,
  };
}
