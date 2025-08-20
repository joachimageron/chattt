import { Injectable } from '@nestjs/common';
import { AuthedSocket } from '../socket.types';
import { ChatEvents } from '../events';
import { MessageService } from '../services/message.service';
import { ParticipantService } from '../services/participant.service';
import { ReactionService } from '../services/reaction.service';
import { sanitizeMessage } from '../sanitize';
import { SendMessageInput } from '../dto/send-message.input';
import { ChatFlowService } from '../services/chat-flow.service';
import { ChatErrorCode } from '../chat-errors';
import { Server } from 'socket.io';

@Injectable()
export class MessageHandler {
  constructor(
    private readonly messages: MessageService,
    private readonly participants: ParticipantService,
    private readonly reactions: ReactionService,
    private readonly flow: ChatFlowService,
  ) {}

  handleSend(
    client: AuthedSocket,
    body: SendMessageInput & { tempId?: string },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(
      client,
      async () => {
        if (!this.flow.checkRateLimit(user.id)) {
          client.emit(ChatEvents.MESSAGE_ERROR, {
            error: {
              code: ChatErrorCode.RATE_LIMITED,
              message: 'rate_limited',
              context: 'message',
              data: { tempId: body.tempId },
            },
          });
          return;
        }
        const message = await this.messages.sendMessage(body, user);
        const sanitized = sanitizeMessage(message);
        server
          .to(message.conversationId)
          .emit(ChatEvents.MESSAGE_NEW, sanitized);
        client.emit(ChatEvents.MESSAGE_SENT, {
          tempId: body.tempId,
          message: sanitized,
        });
        server
          .to(message.conversationId)
          .emit(ChatEvents.CONVERSATION_UPDATED, {
            conversation: {
              id: message.conversationId,
              updatedAt: new Date().toISOString(),
              lastMessage: sanitized,
            },
          });
      },
      () => ({ tempId: body.tempId }),
    );
  }

  handleLoad(
    client: AuthedSocket,
    body: { conversationId: string; before?: string; limit?: number },
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      const page = await this.messages.getMessages(
        body.conversationId,
        body.limit ?? 30,
        body.before || undefined,
      );
      const asc = [...page.messages].reverse();
      client.emit(ChatEvents.MESSAGE_LIST, {
        conversationId: body.conversationId,
        messages: asc.map(sanitizeMessage),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
        direction: body.before ? 'older' : 'initial',
      });
    });
  }

  handleDelivered(
    client: AuthedSocket,
    body: { conversationId: string; messageIds: string[] },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      await this.messages.markDelivered(
        body.conversationId,
        body.messageIds,
        user.id,
      );
      server.to(body.conversationId).emit(ChatEvents.MESSAGE_DELIVERED, {
        messageIds: body.messageIds,
        conversationId: body.conversationId,
        deliveredAt: new Date().toISOString(),
      });
    });
  }

  handleRead(
    client: AuthedSocket,
    body: { conversationId: string; messageIds: string[] },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      await this.messages.markReadMessages(
        body.conversationId,
        body.messageIds,
        user.id,
      );
      const participant = await this.participants.ensureParticipant(
        body.conversationId,
        user.id,
      );
      server.to(body.conversationId).emit(ChatEvents.MESSAGE_READ, {
        messageIds: body.messageIds,
        userId: user.id,
        conversationId: body.conversationId,
        readAt: new Date().toISOString(),
      });
      server.to(body.conversationId).emit(ChatEvents.PARTICIPANT_READ, {
        conversationId: body.conversationId,
        userId: user.id,
        lastReadAt: participant.lastReadAt?.toISOString?.(),
      });
    });
  }

  handleEdit(
    client: AuthedSocket,
    body: { messageId: string; content: string; conversationId: string },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      const updated = await this.messages.editMessage(
        body.messageId,
        user.id,
        body.content,
      );
      server.to(body.conversationId).emit(ChatEvents.MESSAGE_UPDATED, {
        message: sanitizeMessage(updated),
      });
    });
  }

  handleDelete(
    client: AuthedSocket,
    body: { messageId: string; conversationId: string },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      const deleted = await this.messages.deleteMessage(
        body.messageId,
        user.id,
      );
      server
        .to(body.conversationId)
        .emit(ChatEvents.MESSAGE_DELETED, { messageId: deleted.id });
    });
  }

  handleReactionAdd(
    client: AuthedSocket,
    body: { messageId: string; conversationId: string; emoji: string },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      const reactions = await this.reactions.addReaction(
        body.messageId,
        body.conversationId,
        user,
        body.emoji,
      );
      server.to(body.conversationId).emit(ChatEvents.REACTION_ADDED, {
        messageId: body.messageId,
        reactions: reactions.map((r) => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      });
    });
  }

  handleReactionRemove(
    client: AuthedSocket,
    body: { messageId: string; conversationId: string; emoji: string },
    server: Server,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runMessage(client, async () => {
      const reactions = await this.reactions.removeReaction(
        body.messageId,
        body.conversationId,
        user,
        body.emoji,
      );
      server.to(body.conversationId).emit(ChatEvents.REACTION_REMOVED, {
        messageId: body.messageId,
        reactions: reactions.map((r) => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      });
    });
  }
}
