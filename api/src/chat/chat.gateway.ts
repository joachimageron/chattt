import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatEvents } from './events';
import { SendMessageInput } from './dto/send-message.input';
import { CreateConversationInput } from './dto/create-conversation.input';
import { UpdateConversationTitleInput } from './dto/update-conversation-title.input';
import { AuthedSocket } from './socket.types';
import { MessageHandler } from './handlers/message.handler';
import { ConversationHandler } from './handlers/conversation.handler';
import { PresenceHandler } from './handlers/presence.handler';
import { ChatFlowService } from './services/chat-flow.service';

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
    private readonly messageHandler: MessageHandler,
    private readonly conversationHandler: ConversationHandler,
    private readonly presenceHandler: PresenceHandler,
    private readonly flow: ChatFlowService,
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

  // Helpers moved to ChatFlowService (flow)

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
    this.presenceHandler.joinRoom(client, payload);
  }

  @SubscribeMessage(ChatEvents.ROOM_LEAVE)
  async handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    this.presenceHandler.leaveRoom(client, payload);
  }

  // Rate limiting moved to ChatFlowService

  @SubscribeMessage(ChatEvents.MESSAGE_SEND)
  async handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageInput & { tempId?: string },
  ) {
    this.messageHandler.handleSend(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_LOAD)
  async handleLoad(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; before?: string; limit?: number },
  ) {
    this.messageHandler.handleLoad(client, body);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELIVERED)
  async handleDelivered(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; messageIds: string[] },
  ) {
    this.messageHandler.handleDelivered(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_READ)
  async handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { conversationId: string; messageIds: string[] },
  ) {
    this.messageHandler.handleRead(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_EDIT)
  async handleEdit(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; content: string; conversationId: string },
  ) {
    this.messageHandler.handleEdit(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELETE)
  async handleDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string },
  ) {
    this.messageHandler.handleDelete(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.REACTION_ADD)
  async handleReactionAdd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string; emoji: string },
  ) {
    this.messageHandler.handleReactionAdd(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.REACTION_REMOVE)
  async handleReactionRemove(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: { messageId: string; conversationId: string; emoji: string },
  ) {
    this.messageHandler.handleReactionRemove(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_LIST)
  async handleListConversations(@ConnectedSocket() client: AuthedSocket) {
    this.conversationHandler.list(client);
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_CREATE)
  async handleCreateConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: CreateConversationInput,
  ) {
    this.conversationHandler.create(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_TITLE_UPDATE)
  async handleUpdateConversationTitle(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: UpdateConversationTitleInput,
  ) {
    this.conversationHandler.updateTitle(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    this.presenceHandler.typingStart(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    this.presenceHandler.typingStop(client, body, this.server);
  }
}
