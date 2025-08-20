import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReaction } from '../entities/messageReaction.entity';
import { Message } from '../entities/message.entity';
import { ParticipantService } from './participant.service';
import { User } from '../../users/entities/user.entity';
import { CHAT_CONSTANTS } from '../chat.constants';

@Injectable()
export class ReactionService {
  constructor(
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly participantService: ParticipantService,
  ) {}

  async addReaction(
    messageId: string,
    conversationId: string,
    user: User,
    emoji: string,
  ): Promise<MessageReaction> {
    await this.participantService.ensureParticipant(conversationId, user.id);
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.conversationId !== conversationId)
      throw new ForbiddenException('Message not in conversation');
    const sanitizedEmoji = emoji
      .trim()
      .slice(0, CHAT_CONSTANTS.REACTION.EMOJI_MAX_LENGTH);
    if (!sanitizedEmoji) throw new ForbiddenException('Emoji vide');
    await this.reactionRepo
      .createQueryBuilder()
      .insert()
      .into(MessageReaction)
      .values({ messageId, userId: user.id, emoji: sanitizedEmoji })
      .orIgnore()
      .execute();
    // Fetch (whether newly inserted or existing) for idempotent behaviour
    const reaction = await this.reactionRepo.findOne({
      where: { messageId, userId: user.id, emoji: sanitizedEmoji },
    });
    // Should always exist now
    return reaction!;
  }

  async removeReaction(
    messageId: string,
    conversationId: string,
    user: User,
    emoji: string,
  ): Promise<{ messageId: string; userId: string; emoji: string }> {
    await this.participantService.ensureParticipant(conversationId, user.id);
    const sanitizedEmoji = emoji
      .trim()
      .slice(0, CHAT_CONSTANTS.REACTION.EMOJI_MAX_LENGTH);
    await this.reactionRepo.delete({
      messageId,
      userId: user.id,
      emoji: sanitizedEmoji,
    });
    return { messageId, userId: user.id, emoji: sanitizedEmoji };
  }
}
