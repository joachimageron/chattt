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
import { ChatService } from './chat.service';
import { SendMessageInput } from './dto/send-message.input';
import { CreateConversationInput } from './dto/create-conversation.input';
import { sanitizeConversation, sanitizeMessage } from './sanitize';
import { UpdateConversationTitleInput } from './dto/update-conversation-title.input';

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

  constructor(private readonly chatService: ChatService) {}

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

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthedSocket) {
    this.logger.log(
      `Received ping from ${client.data.user?.email || 'unknown user'}`,
    );
    const user = client.data.user;
    client.emit('pong', { message: 'pong', userId: user?.email });
  }

  @SubscribeMessage('room.join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    const { conversationId } = payload;
    try {
      await this.chatService.ensureParticipant(conversationId, user.id);
      await client.join(conversationId);
      client.data.joinedRooms?.add(conversationId);
      client.emit('room.joined', { conversationId });
    } catch (e) {
      client.emit('error', {
        message: 'join_failed',
        details: (e as Error).message,
      });
    }
  }

  @SubscribeMessage('room.leave')
  async handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const { conversationId } = payload;
    await client.leave(conversationId);
    client.data.joinedRooms?.delete(conversationId);
    client.emit('room.left', { conversationId });
  }

  @SubscribeMessage('message.send')
  async handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageInput & { tempId?: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const message = await this.chatService.sendMessage(body, user);
      const sanitized = sanitizeMessage(message);
      this.server.to(message.conversationId).emit('message.new', sanitized);
      client.emit('message.sent', { tempId: body.tempId, message: sanitized });
    } catch (e) {
      client.emit('message.error', { error: (e as Error).message });
    }
  }

  @SubscribeMessage('message.load')
  async handleLoad(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; before?: string; limit?: number },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.chatService.ensureParticipant(body.conversationId, user.id);
      const messages = await this.chatService.getMessages(
        body.conversationId,
        body.limit ?? 30,
        body.before ? new Date(body.before) : undefined,
      );
      client.emit('message.list', {
        conversationId: body.conversationId,
        messages: messages.map(sanitizeMessage),
        hasMore: messages.length === (body.limit ?? 30),
      });
    } catch (e) {
      client.emit('message.error', { error: (e as Error).message });
    }
  }

  @SubscribeMessage('message.delivered')
  async handleDelivered(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; messageIds: string[] },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.chatService.markDelivered(
        body.conversationId,
        body.messageIds,
        user.id,
      );
      this.server.to(body.conversationId).emit('message.delivered', {
        messageIds: body.messageIds,
        conversationId: body.conversationId,
        deliveredAt: new Date().toISOString(),
      });
    } catch (e) {
      client.emit('message.error', { error: (e as Error).message });
    }
  }

  @SubscribeMessage('message.read')
  async handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; messageIds: string[] },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      await this.chatService.markReadMessages(
        body.conversationId,
        body.messageIds,
        user.id,
      );
      // Récupère la date de lecture de ce participant pour mise à jour fine côté front
      const participant = await this.chatService.ensureParticipant(
        body.conversationId,
        user.id,
      );
      this.server.to(body.conversationId).emit('message.read', {
        messageIds: body.messageIds,
        userId: user.id,
        conversationId: body.conversationId,
        readAt: new Date().toISOString(),
      });
      this.server.to(body.conversationId).emit('participant.read', {
        conversationId: body.conversationId,
        userId: user.id,
        lastReadAt: participant.lastReadAt?.toISOString?.(),
      });
    } catch (e) {
      client.emit('message.error', { error: (e as Error).message });
    }
  }

  @SubscribeMessage('message.edit')
  async handleEdit(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; content: string; conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const updated = await this.chatService.editMessage(
        body.messageId,
        user.id,
        body.content,
      );
      this.server
        .to(body.conversationId)
        .emit('message.updated', { message: sanitizeMessage(updated) });
    } catch (e) {
      client.emit('message.error', { error: (e as Error).message });
    }
  }

  @SubscribeMessage('message.delete')
  async handleDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const deleted = await this.chatService.deleteMessage(
        body.messageId,
        user.id,
      );
      this.server
        .to(body.conversationId)
        .emit('message.deleted', { messageId: deleted.id });
    } catch (e) {
      client.emit('message.error', { error: (e as Error).message });
    }
  }

  @SubscribeMessage('conversation.list')
  async handleListConversations(@ConnectedSocket() client: AuthedSocket) {
    const user = client.data.user;
    if (!user) return;
    try {
      const conversations = await this.chatService.listConversationsForUser(
        user.id,
      );
      client.emit('conversation.list', {
        conversations: conversations.map(sanitizeConversation),
      });
    } catch (e) {
      client.emit('error', { message: (e as Error).message });
    }
  }

  @SubscribeMessage('conversation.create')
  async handleCreateConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: CreateConversationInput,
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const convo = await this.chatService.createConversation(user.id, body);
      // join creator to room automatically
      await client.join(convo.id);
      client.data.joinedRooms?.add(convo.id);
      // emit to creator
      client.emit('conversation.created', {
        conversation: sanitizeConversation(convo),
      });
      // inform other participants if they are connected
      convo.participants
        .filter((p) => p.userId !== user.id)
        .forEach(() => {
          this.server.to(convo.id).emit('conversation.updated', {
            conversation: sanitizeConversation(convo),
          });
        });
    } catch (e) {
      client.emit('error', { message: (e as Error).message });
    }
  }

  @SubscribeMessage('conversation.title.update')
  async handleUpdateConversationTitle(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: UpdateConversationTitleInput,
  ) {
    const user = client.data.user;
    if (!user) return;
    try {
      const convo = await this.chatService.updateConversationTitle(
        body.conversationId,
        user.id,
        body.title,
      );
      this.server.to(convo.id).emit('conversation.updated', {
        conversation: sanitizeConversation(convo),
      });
    } catch (e) {
      client.emit('error', { message: (e as Error).message });
    }
  }

  @SubscribeMessage('typing.start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    if (!body?.conversationId) return;
    try {
      await this.chatService.ensureParticipant(body.conversationId, user.id);
      // Broadcast aux autres participants uniquement (room broadcast sans l'émetteur)
      client.to(body.conversationId).emit('typing.started', {
        conversationId: body.conversationId,
        userId: user.id,
        at: new Date().toISOString(),
      });
    } catch (e) {
      client.emit('error', { message: (e as Error).message });
    }
  }

  @SubscribeMessage('typing.stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    if (!body?.conversationId) return;
    try {
      await this.chatService.ensureParticipant(body.conversationId, user.id);
      client.to(body.conversationId).emit('typing.stopped', {
        conversationId: body.conversationId,
        userId: user.id,
        at: new Date().toISOString(),
      });
    } catch (e) {
      client.emit('error', { message: (e as Error).message });
    }
  }
}
