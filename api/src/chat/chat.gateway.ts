import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { ParticipantService } from './services/participant.service';
import { MessageService } from './services/message.service';
import { ReactionService } from './services/reaction.service';
import { ConversationService } from './services/conversation.service';
import { SendMessageInput } from './dto/send-message.input';
import { CreateConversationInput } from './dto/create-conversation.input';
import { sanitizeConversation, sanitizeMessage } from './sanitize';
import { UpdateConversationTitleInput } from './dto/update-conversation-title.input';
import { ChatEvents } from './events';

// augment Socket type locally
interface AuthedSocket extends Socket {
  data: { user?: User; joinedRooms?: Set<string> };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly participants: ParticipantService,
    private readonly messages: MessageService,
    private readonly reactions: ReactionService,
    private readonly conversations: ConversationService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: AuthedSocket) {
    const user = client.data.user;
    client.data.joinedRooms = new Set();
    this.logger.log(
      `Client connected: ${client.id}${user ? ' user=' + user.email : ''}`,
    );
  }

  handleDisconnect(client: AuthedSocket) {
    const user = client.data.user;
    this.logger.log(
      `Client disconnected: ${client.id}${user ? ' user=' + user.email : ''}`,
    );
  }

  @SubscribeMessage(ChatEvents.PING)
  handlePing(@ConnectedSocket() client: AuthedSocket) {
    this.logger.log(
      `Received ping from ${client.data.user?.email || 'unknown user'}`,
    );
    const user = client.data.user;
    client.emit(ChatEvents.PONG, { message: 'pong', userId: user?.email });
  }

  @SubscribeMessage(ChatEvents.ROOM_JOIN)
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    const { conversationId } = payload;
    try {
      await this.participants.ensureParticipant(conversationId, user.id);
      await client.join(conversationId);
      client.data.joinedRooms?.add(conversationId);
      client.emit(ChatEvents.ROOM_JOINED, { conversationId });
    } catch (e) {
      client.emit(ChatEvents.ERROR, {
        message: 'join_failed',
        details: (e as Error).message,
      });
    }
  }

  @SubscribeMessage(ChatEvents.ROOM_LEAVE)
  async handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const { conversationId } = payload;
    await client.leave(conversationId);
    client.data.joinedRooms?.delete(conversationId);
    client.emit(ChatEvents.ROOM_LEFT, { conversationId });
  }

  // In-memory per-user rate limiter (simple window). For production, externalize (Redis, etc.).
  private rateLimitMap: Map<string, { windowStart: number; count: number }> =
    new Map();
  private readonly RATE_LIMIT_MAX = Number(
    process.env.CHAT_RATE_LIMIT_PER_MINUTE || 120,
  );
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const WINDOW_MS = 60_000;
    const entry = this.rateLimitMap.get(userId);
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      this.rateLimitMap.set(userId, { windowStart: now, count: 1 });
      return true;
    }
    if (entry.count >= this.RATE_LIMIT_MAX) return false;
    entry.count += 1;
    return true;
  }

  @SubscribeMessage(ChatEvents.MESSAGE_SEND)
  async handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageInput & { tempId?: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      if (!this.checkRateLimit(user.id)) {
        client.emit(ChatEvents.MESSAGE_ERROR, {
          error: 'rate_limited',
          tempId: body.tempId,
        });
        return;
      }
      const message = await this.messages.sendMessage(body, user);
      const sanitized = sanitizeMessage(message);
      this.server
        .to(message.conversationId)
        .emit(ChatEvents.MESSAGE_NEW, sanitized);
      client.emit(ChatEvents.MESSAGE_SENT, {
        tempId: body.tempId,
        message: sanitized,
      });
      // Light conversation update (lastMessage + updatedAt) for list reordering
      this.server
        .to(message.conversationId)
        .emit(ChatEvents.CONVERSATION_UPDATED, {
          conversation: {
            id: message.conversationId,
            updatedAt: new Date().toISOString(),
            lastMessage: sanitized,
          },
        });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, {
        error: (e as Error).message,
        tempId: body.tempId,
      });
    }
  }

  @SubscribeMessage(ChatEvents.MESSAGE_LOAD)
  async handleLoad(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; before?: string; limit?: number },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      const page = await this.messages.getMessages(
        body.conversationId,
        body.limit ?? 30,
        body.before || undefined,
      );
      // page.messages renvoyés en DESC (createdAt DESC). On inverse pour le client (ASC) pour traitement/pagination cohérente.
      const asc = [...page.messages].reverse();
      client.emit(ChatEvents.MESSAGE_LIST, {
        conversationId: body.conversationId,
        messages: asc.map(sanitizeMessage),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
        direction: body.before ? 'older' : 'initial',
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELIVERED)
  async handleDelivered(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; messageIds: string[] },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.messages.markDelivered(
        body.conversationId,
        body.messageIds,
        user.id,
      );
      this.server.to(body.conversationId).emit(ChatEvents.MESSAGE_DELIVERED, {
        messageIds: body.messageIds,
        conversationId: body.conversationId,
        deliveredAt: new Date().toISOString(),
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.MESSAGE_READ)
  async handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; messageIds: string[] },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.messages.markReadMessages(
        body.conversationId,
        body.messageIds,
        user.id,
      );
      const participant = await this.participants.ensureParticipant(
        body.conversationId,
        user.id,
      );
      this.server.to(body.conversationId).emit(ChatEvents.MESSAGE_READ, {
        messageIds: body.messageIds,
        userId: user.id,
        conversationId: body.conversationId,
        readAt: new Date().toISOString(),
      });
      this.server.to(body.conversationId).emit(ChatEvents.PARTICIPANT_READ, {
        conversationId: body.conversationId,
        userId: user.id,
        lastReadAt: participant.lastReadAt?.toISOString?.(),
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.MESSAGE_EDIT)
  async handleEdit(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; content: string; conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const updated = await this.messages.editMessage(
        body.messageId,
        user.id,
        body.content,
      );
      this.server.to(body.conversationId).emit(ChatEvents.MESSAGE_UPDATED, {
        message: sanitizeMessage(updated),
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELETE)
  async handleDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const deleted = await this.messages.deleteMessage(
        body.messageId,
        user.id,
      );
      this.server.to(body.conversationId).emit(ChatEvents.MESSAGE_DELETED, {
        messageId: deleted.id,
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.REACTION_ADD)
  async handleReactionAdd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string; emoji: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const reactions = await this.reactions.addReaction(
        body.messageId,
        body.conversationId,
        user,
        body.emoji,
      );
      this.server.to(body.conversationId).emit(ChatEvents.REACTION_ADDED, {
        messageId: body.messageId,
        reactions: reactions.map((r) => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.REACTION_REMOVE)
  async handleReactionRemove(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string; emoji: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const reactions = await this.reactions.removeReaction(
        body.messageId,
        body.conversationId,
        user,
        body.emoji,
      );
      this.server.to(body.conversationId).emit(ChatEvents.REACTION_REMOVED, {
        messageId: body.messageId,
        reactions: reactions.map((r) => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      });
    } catch (e) {
      client.emit(ChatEvents.MESSAGE_ERROR, { error: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_LIST)
  async handleListConversations(@ConnectedSocket() client: AuthedSocket) {
    const user = client.data.user;
    if (!user) return;
    try {
      const conversations = await this.conversations.listConversationsForUser(
        user.id,
      );
      client.emit(ChatEvents.CONVERSATION_LIST_DATA, {
        conversations: conversations.map(sanitizeConversation),
      });
    } catch (e) {
      client.emit(ChatEvents.ERROR, { message: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_CREATE)
  async handleCreateConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: CreateConversationInput,
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const convo = await this.conversations.createConversation(user.id, body);
      // join creator to room automatically
      await client.join(convo.id);
      client.data.joinedRooms?.add(convo.id);
      // emit to creator
      client.emit(ChatEvents.CONVERSATION_CREATED, {
        conversation: sanitizeConversation(convo),
      });
      // inform other participants if they are connected
      convo.participants
        .filter((p) => p.userId !== user.id)
        .forEach(() => {
          this.server.to(convo.id).emit(ChatEvents.CONVERSATION_UPDATED, {
            conversation: sanitizeConversation(convo),
          });
        });
    } catch (e) {
      client.emit(ChatEvents.ERROR, { message: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_TITLE_UPDATE)
  async handleUpdateConversationTitle(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: UpdateConversationTitleInput,
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const convo = await this.conversations.updateConversationTitle(
        body.conversationId,
        user.id,
        body.title,
      );
      this.server.to(convo.id).emit(ChatEvents.CONVERSATION_UPDATED, {
        conversation: sanitizeConversation(convo),
      });
    } catch (e) {
      client.emit(ChatEvents.ERROR, { message: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    if (!body?.conversationId) return;
    try {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      // Broadcast aux autres participants uniquement (room broadcast sans l'émetteur)
      client.to(body.conversationId).emit(ChatEvents.TYPING_STARTED, {
        conversationId: body.conversationId,
        userId: user.id,
        at: new Date().toISOString(),
      });
    } catch (e) {
      client.emit(ChatEvents.ERROR, { message: (e as Error).message });
    }
  }

  @SubscribeMessage(ChatEvents.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    if (!body?.conversationId) return;
    try {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      client.to(body.conversationId).emit(ChatEvents.TYPING_STOPPED, {
        conversationId: body.conversationId,
        userId: user.id,
        at: new Date().toISOString(),
      });
    } catch (e) {
      client.emit(ChatEvents.ERROR, { message: (e as Error).message });
    }
  }
}
