import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationParticipant } from '../entities/conversation-participant.entity';

@Injectable()
export class ParticipantService {
  constructor(
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

  async markRead(conversationId: string, userId: string): Promise<void> {
    const participant = await this.ensureParticipant(conversationId, userId);
    participant.lastReadAt = new Date();
    await this.participantRepo.save(participant);
  }
}
