import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/messageReaction.entity';
import { User } from '../users/entities/user.entity';

// We extend the persisted entities with relation properties that may or may not
// be loaded at runtime (depending on query builder selections). This allows us
// to avoid unsafe any casts while still being flexible.
type MessageWithOptionals = Message & {
  sender?: User | null;
  reactions?: (MessageReaction & { user?: User | null })[];
};
type ParticipantWithUser = ConversationParticipant & { user?: User | null };

export function sanitizeUser(user?: User | null) {
  if (!user) return undefined;
  const { id, email, name, createdAt } = user;
  return { id, email, name, createdAt };
}

export function sanitizeMessage(message: MessageWithOptionals) {
  const reactions = message.reactions ?? [];
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
    sender: sanitizeUser(message.sender),
    reactions: reactions.map((r) => ({
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt,
      user: sanitizeUser(r.user),
    })),
  };
}

export function sanitizeParticipant(p: ParticipantWithUser) {
  return {
    userId: p.userId,
    lastReadAt: p.lastReadAt,
    user: sanitizeUser(p.user),
  };
}

export function sanitizeConversation(convo: Conversation) {
  let lastMessage;
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
    participants: (convo.participants || []).map(sanitizeParticipant),
    lastMessage: lastMessage
      ? sanitizeMessage(lastMessage as unknown as MessageWithOptionals)
      : undefined,
  };
}
