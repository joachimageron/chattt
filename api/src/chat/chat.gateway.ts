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
import { LoadMessagesInput } from './dto/load-messages.input';
import { MarkDeliveredInput } from './dto/mark-delivered.input';
import { MarkReadInput } from './dto/mark-read.input';
import { EditMessageInput } from './dto/edit-message.input';
import { DeleteMessageInput } from './dto/delete-message.input';
import { ReactionInput } from './dto/reaction.input';
import { JoinRoomInput } from './dto/join-room.input';
import { TypingEventInput } from './dto/typing-event.input';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  // NOTE: All error emissions now follow shape { error: { code, message, context, data? } }

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
  handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: JoinRoomInput,
  ) {
    this.presenceHandler.joinRoom(client, payload);
  }

  @SubscribeMessage(ChatEvents.ROOM_LEAVE)
  handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: JoinRoomInput,
  ) {
    this.presenceHandler.leaveRoom(client, payload);
  }

  // Rate limiting moved to ChatFlowService

  @SubscribeMessage(ChatEvents.MESSAGE_SEND)
  handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessageInput & { tempId?: string },
  ) {
    this.messageHandler.handleSend(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_LOAD)
  handleLoad(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: LoadMessagesInput,
  ) {
    this.messageHandler.handleLoad(client, body);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELIVERED)
  handleDelivered(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: MarkDeliveredInput,
  ) {
    this.messageHandler.handleDelivered(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_READ)
  handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: MarkReadInput,
  ) {
    this.messageHandler.handleRead(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_EDIT)
  handleEdit(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: EditMessageInput,
  ) {
    this.messageHandler.handleEdit(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELETE)
  handleDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: DeleteMessageInput,
  ) {
    this.messageHandler.handleDelete(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.REACTION_ADD)
  handleReactionAdd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: ReactionInput,
  ) {
    this.messageHandler.handleReactionAdd(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.REACTION_REMOVE)
  handleReactionRemove(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: ReactionInput,
  ) {
    this.messageHandler.handleReactionRemove(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_LIST)
  handleListConversations(@ConnectedSocket() client: AuthedSocket) {
    this.conversationHandler.list(client);
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_CREATE)
  handleCreateConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: CreateConversationInput,
  ) {
    this.conversationHandler.create(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.CONVERSATION_TITLE_UPDATE)
  handleUpdateConversationTitle(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: UpdateConversationTitleInput,
  ) {
    this.conversationHandler.updateTitle(client, body, this.server);
  }

  @SubscribeMessage(ChatEvents.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: TypingEventInput,
  ) {
    this.presenceHandler.typingStart(client, body);
  }

  @SubscribeMessage(ChatEvents.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: TypingEventInput,
  ) {
    this.presenceHandler.typingStop(client, body);
  }
}
