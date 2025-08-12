import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversationParticipant.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';

export function sanitizeUser(user?: User | null) {
  if (!user) return undefined;
  const { id, email, name, createdAt } = user;
  return { id, email, name, createdAt };
}

export function sanitizeMessage(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    type: message.type,
    status: message.status,
    editedAt: message.editedAt,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    sender: sanitizeUser((message as unknown as { sender?: User }).sender),
  };
}

export function sanitizeParticipant(p: ConversationParticipant) {
  return {
    userId: p.userId,
    lastReadAt: p.lastReadAt,
    user: sanitizeUser((p as unknown as { user?: User }).user),
  };
}

export function sanitizeConversation(convo: Conversation) {
  return {
    id: convo.id,
    type: convo.type,
    title: convo.title,
    createdAt: convo.createdAt,
    updatedAt: convo.updatedAt,
    participants: (convo.participants || []).map(sanitizeParticipant),
    lastMessage:
      convo.messages && convo.messages.length
        ? sanitizeMessage(
            [...convo.messages].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            )[0],
          )
        : undefined,
  };
}
