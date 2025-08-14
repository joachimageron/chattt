import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Message,
  MessageStatus,
  MessageType,
} from '../entities/message.entity';
import { ParticipantService } from './participant.service';
import { User } from '../../users/entities/user.entity';
import { SendMessageInput } from '../dto/send-message.input';
import { CHAT_CONSTANTS } from '../chat.constants';
import { MessageReaction } from '../entities/messageReaction.entity';
import { Conversation } from '../entities/conversation.entity';

export interface MessagePaginationResult {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    @InjectRepository(Conversation)
    private readonly convoRepo: Repository<Conversation>,
    private readonly participantService: ParticipantService,
  ) {}

  async sendMessage(input: SendMessageInput, sender: User): Promise<Message> {
    await this.participantService.ensureParticipant(
      input.conversationId,
      sender.id,
    );
    if (input.content.length > CHAT_CONSTANTS.MESSAGE.MAX_LENGTH) {
      throw new ForbiddenException('Message too long');
    }
    const message = this.messageRepo.create({
      conversationId: input.conversationId,
      senderId: sender.id,
      content: input.content,
      type: input.type ?? MessageType.TEXT,
      status: MessageStatus.SENT,
    });
    message.sender = sender;
    await this.messageRepo.save(message);
    await this.convoRepo.update(
      { id: input.conversationId },
      { updatedAt: new Date() },
    );
    return message;
  }

  async getMessages(
    conversationId: string,
    limit = 30,
    cursor?: string,
  ): Promise<MessagePaginationResult> {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .where('m.conversationId = :conversationId', { conversationId });
    if (cursor) {
      qb.andWhere('m.createdAt < :cursor', { cursor });
    }
    const rows = await qb
      .orderBy('m.createdAt', 'DESC')
      .take(limit + 1)
      .getMany();
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    if (!sliced.length) return { messages: [], hasMore: false };
    const ids = sliced.map((m) => m.id);
    const reactions = await this.reactionRepo.find({
      where: { messageId: In(ids) },
    });
    const map: Record<string, MessageReaction[]> = {};
    reactions.forEach((r) => {
      map[r.messageId] = map[r.messageId] || [];
      map[r.messageId].push(r);
    });
    (sliced as (Message & { reactions?: MessageReaction[] })[]).forEach(
      (m) => (m['reactions'] = map[m.id] || []),
    );
    const oldest = sliced[sliced.length - 1];
    return {
      messages: sliced,
      hasMore,
      nextCursor: hasMore ? oldest.createdAt.toISOString() : undefined,
    };
  }

  async markDelivered(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ) {
    await this.participantService.ensureParticipant(conversationId, userId);
    if (!messageIds.length) return;
    const now = new Date();
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ status: MessageStatus.DELIVERED, deliveredAt: now })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('id IN (:...ids)', { ids: messageIds })
      .andWhere('status = :sent', { sent: MessageStatus.SENT })
      .execute();
  }

  async markReadMessages(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ) {
    await this.participantService.ensureParticipant(conversationId, userId);
    if (!messageIds.length) return;
    const now = new Date();
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ status: MessageStatus.READ, readAt: now })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('id IN (:...ids)', { ids: messageIds })
      .andWhere('status != :read', { read: MessageStatus.READ })
      .execute();
    await this.participantService.markRead(conversationId, userId);
  }

  async editMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException('Cannot edit this message');
    if (message.isDeleted) throw new ForbiddenException('Message deleted');
    const EDIT_WINDOW_MS = CHAT_CONSTANTS.MESSAGE.EDIT_WINDOW_MS;
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new ForbiddenException('Edit window expired');
    }
    if (message.content === content) return message;
    message.content = content;
    message.editedAt = new Date();
    return this.messageRepo.save(message);
  }

  async deleteMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException('Cannot delete this message');
    const DELETE_WINDOW_MS = CHAT_CONSTANTS.MESSAGE.DELETE_WINDOW_MS;
    if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
      throw new ForbiddenException('Delete window expired');
    }
    message.isDeleted = true;
    message.content = '';
    return this.messageRepo.save(message);
  }
}
