import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message, MessageType, MessageStatus } from './entities/message.entity';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversationParticipant.entity';
import { SendMessageInput } from './dto/send-message.input';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly convoRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
  ) {}

  async ensureParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationParticipant> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }
    return participant;
  }

  async sendMessage(input: SendMessageInput, sender: User): Promise<Message> {
    await this.ensureParticipant(input.conversationId, sender.id);

    const message = this.messageRepo.create({
      conversationId: input.conversationId,
      senderId: sender.id,
      content: input.content,
      type: input.type ?? MessageType.TEXT,
      status: MessageStatus.SENT,
    });
    return this.messageRepo.save(message);
  }

  async getMessages(
    conversationId: string,
    limit = 30,
    before?: Date,
  ): Promise<Message[]> {
    return this.messageRepo.find({
      where: {
        conversationId,
        ...(before ? { createdAt: LessThan(before) } : {}),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    const participant = await this.ensureParticipant(conversationId, userId);
    participant.lastReadAt = new Date();
    await this.participantRepo.save(participant);
  }

  async markDelivered(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ) {
    // Ensure user is participant (authorization)
    await this.ensureParticipant(conversationId, userId);
    if (!messageIds.length) return;
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ status: MessageStatus.DELIVERED })
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
    await this.ensureParticipant(conversationId, userId);
    if (!messageIds.length) return;
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ status: MessageStatus.READ })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('id IN (:...ids)', { ids: messageIds })
      .andWhere('status != :read', { read: MessageStatus.READ })
      .execute();
    await this.markRead(conversationId, userId);
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
    message.isDeleted = true;
    message.content = '';
    return this.messageRepo.save(message);
  }

  async listConversationsForUser(userId: string): Promise<Conversation[]> {
    return this.convoRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.participants', 'p')
      .leftJoinAndSelect('c.messages', 'm')
      .where('p.userId = :userId', { userId })
      .orderBy('m.createdAt', 'DESC')
      .getMany();
  }

  async createDirectConversation(
    userAId: string,
    userBId: string,
  ): Promise<Conversation> {
    const sorted = [userAId, userBId].sort();

    const existing = await this.convoRepo
      .createQueryBuilder('c')
      .innerJoin(
        ConversationParticipant,
        'p1',
        'p1.conversationId = c.id AND p1.userId = :u1',
        { u1: sorted[0] },
      )
      .innerJoin(
        ConversationParticipant,
        'p2',
        'p2.conversationId = c.id AND p2.userId = :u2',
        { u2: sorted[1] },
      )
      .leftJoin(ConversationParticipant, 'pAll', 'pAll.conversationId = c.id')
      .where('c.type = :type', { type: ConversationType.DIRECT })
      .groupBy('c.id')
      .having('COUNT(DISTINCT pAll.userId) = 2')
      .getOne();

    if (existing) return existing;

    let convo = this.convoRepo.create({ type: ConversationType.DIRECT });
    convo = await this.convoRepo.save(convo);
    await this.participantRepo.save([
      this.participantRepo.create({
        conversationId: convo.id,
        userId: sorted[0],
      }),
      this.participantRepo.create({
        conversationId: convo.id,
        userId: sorted[1],
      }),
    ]);
    return convo;
  }

  async findConversation(id: string): Promise<Conversation> {
    const convo = await this.convoRepo.findOne({ where: { id } });
    if (!convo) throw new NotFoundException('Conversation not found');
    return convo;
  }
}
