import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ParticipantService } from './services/participant.service';
import { ReactionService } from './services/reaction.service';
import { MessageService } from './services/message.service';
import { ConversationService } from './services/conversation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversationParticipant.entity';
import { MessageReaction } from './entities/messageReaction.entity';
import { ChatFlowService } from './services/chat-flow.service';
import { MessageHandler } from './handlers/message.handler';
import { ConversationHandler } from './handlers/conversation.handler';
import { PresenceHandler } from './handlers/presence.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      Conversation,
      ConversationParticipant,
      MessageReaction,
    ]),
  ],
  providers: [
    ChatGateway,
    ParticipantService,
    ReactionService,
    MessageService,
    ConversationService,
    ChatFlowService,
    MessageHandler,
    ConversationHandler,
    PresenceHandler,
  ],
  exports: [
    ParticipantService,
    ReactionService,
    MessageService,
    ConversationService,
    ChatFlowService,
  ],
})
export class ChatModule {}
