import { Injectable } from '@nestjs/common';
import { AuthedSocket } from '../socket.types';
import { ChatEvents } from '../events';
import { MessageService } from '../services/message.service';
import { ParticipantService } from '../services/participant.service';
import { ReactionService } from '../services/reaction.service';
import { toMessageDto, toReactionDto } from '../mappers';
import { SendMessageInput } from '../dto/send-message.input';
import { LoadMessagesInput } from '../dto/load-messages.input';
import { MarkDeliveredInput } from '../dto/mark-delivered.input';
import { MarkReadInput } from '../dto/mark-read.input';
import { EditMessageInput } from '../dto/edit-message.input';
import { DeleteMessageInput } from '../dto/delete-message.input';
import { ReactionInput } from '../dto/reaction.input';
import { ExecutionContextService } from '../services/execution-context.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { ChatErrorCode } from '../chat-errors';
import { Server } from 'socket.io';

@Injectable()
export class MessageHandler {
  constructor(
    private readonly messages: MessageService,
    private readonly participants: ParticipantService,
    private readonly reactions: ReactionService,
    private readonly exec: ExecutionContextService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  handleSend(
    client: AuthedSocket,
    body: SendMessageInput & { tempId?: string },
    server: Server,
  ) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(
      client,
      async () => {
        if (!this.rateLimiter.check(user.id)) {
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
        const sanitized = toMessageDto(
          message as typeof message & {
            reactions?: any[]; // none at creation
          },
        );
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

  handleLoad(client: AuthedSocket, body: LoadMessagesInput) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      const page = await this.messages.getMessages(
        body.conversationId,
        body.limit ?? 30,
        body.before || undefined,
      );
      client.emit(ChatEvents.MESSAGE_LIST, {
        conversationId: body.conversationId,
        messages: page.messages.map((m) =>
          toMessageDto(
            m as typeof m & {
              reactions?: any[];
            },
          ),
        ),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
        direction: body.before ? 'older' : 'initial',
      });
    });
  }

  handleDelivered(
    client: AuthedSocket,
    body: MarkDeliveredInput,
    server: Server,
  ) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
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

  handleRead(client: AuthedSocket, body: MarkReadInput, server: Server) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
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

  handleEdit(client: AuthedSocket, body: EditMessageInput, server: Server) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
      const updated = await this.messages.editMessage(
        body.messageId,
        user.id,
        body.content,
      );
      server.to(body.conversationId).emit(ChatEvents.MESSAGE_UPDATED, {
        message: toMessageDto(
          updated as typeof updated & {
            reactions?: any[];
          },
        ),
      });
    });
  }

  handleDelete(client: AuthedSocket, body: DeleteMessageInput, server: Server) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
      const deleted = await this.messages.deleteMessage(
        body.messageId,
        user.id,
      );
      server
        .to(body.conversationId)
        .emit(ChatEvents.MESSAGE_DELETED, { messageId: deleted.id });
    });
  }

  handleReactionAdd(client: AuthedSocket, body: ReactionInput, server: Server) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
      const reaction = await this.reactions.addReaction(
        body.messageId,
        body.conversationId,
        user,
        body.emoji,
      );
      server.to(body.conversationId).emit(ChatEvents.REACTION_ADDED, {
        messageId: body.messageId,
        reaction: toReactionDto(reaction as typeof reaction & { user?: any }),
      });
    });
  }

  handleReactionRemove(
    client: AuthedSocket,
    body: ReactionInput,
    server: Server,
  ) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runMessage(client, async () => {
      const removed = await this.reactions.removeReaction(
        body.messageId,
        body.conversationId,
        user,
        body.emoji,
      );
      server.to(body.conversationId).emit(ChatEvents.REACTION_REMOVED, {
        messageId: body.messageId,
        reaction: removed,
      });
    });
  }
}
