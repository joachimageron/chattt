import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Conversation,
  ConversationType,
} from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversationParticipant.entity';
import { CreateConversationInput } from '../dto/create-conversation.input';
import { ParticipantService } from './participant.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Conversation)
    private readonly convoRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    private readonly participantService: ParticipantService,
  ) {}

  async listConversationsForUser(userId: string): Promise<Conversation[]> {
    return this.convoRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'selfP', 'selfP.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('c.participants', 'p')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('c.messages', 'm')
      .distinct(true)
      .orderBy('c.updatedAt', 'DESC')
      .getMany();
  }

  async createDirectConversation(
    userAId: string,
    userBId: string,
  ): Promise<Conversation> {
    const sorted = [userAId, userBId].sort();
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(Conversation)
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
      if (existing) {
        const full = await manager.getRepository(Conversation).findOne({
          where: { id: existing.id },
          relations: ['participants', 'participants.user', 'messages'],
        });
        return full ?? existing;
      }
      let convo = manager.getRepository(Conversation).create({
        type: ConversationType.DIRECT,
      });
      convo = await manager.getRepository(Conversation).save(convo);
      await manager.getRepository(ConversationParticipant).save([
        manager.getRepository(ConversationParticipant).create({
          conversationId: convo.id,
          userId: sorted[0],
        }),
        manager.getRepository(ConversationParticipant).create({
          conversationId: convo.id,
          userId: sorted[1],
        }),
      ]);
      const fullNew = await manager.getRepository(Conversation).findOne({
        where: { id: convo.id },
        relations: ['participants', 'participants.user', 'messages'],
      });
      return fullNew ?? convo;
    });
  }

  async createConversation(
    currentUserId: string,
    input: CreateConversationInput,
  ): Promise<Conversation> {
    const participantIds = Array.from(
      new Set([currentUserId, ...input.participantUserIds]),
    );
    if (input.type === ConversationType.DIRECT && participantIds.length === 2) {
      return this.createDirectConversation(
        participantIds[0],
        participantIds[1],
      );
    }
    return this.dataSource.transaction(async (manager) => {
      let convo = manager.getRepository(Conversation).create({
        type: input.type ?? ConversationType.GROUP,
        title: input.title,
      });
      convo = await manager.getRepository(Conversation).save(convo);
      await manager.getRepository(ConversationParticipant).save(
        participantIds.map((userId) =>
          manager.getRepository(ConversationParticipant).create({
            conversationId: convo.id,
            userId,
          }),
        ),
      );
      const full = await manager.getRepository(Conversation).findOne({
        where: { id: convo.id },
        relations: ['participants', 'participants.user', 'messages'],
      });
      return full ?? convo;
    });
  }

  async findConversation(id: string): Promise<Conversation> {
    const convo = await this.convoRepo.findOne({ where: { id: id } });
    if (!convo) throw new NotFoundException('Conversation not found');
    return convo;
  }

  async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string,
  ): Promise<Conversation> {
    const convo = await this.convoRepo.findOne({
      where: { id: conversationId },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    if (convo.type !== ConversationType.GROUP) {
      throw new ForbiddenException('Only group conversations can be renamed');
    }
    await this.participantService.ensureParticipant(conversationId, userId);
    const trimmed = title.trim();
    if (!trimmed) throw new ForbiddenException('Title cannot be empty');
    if (trimmed === convo.title) return convo;
    convo.title = trimmed.slice(0, 120);
    await this.convoRepo.save(convo);
    return convo;
  }
}
