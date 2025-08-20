import { Injectable } from '@nestjs/common';
import { AuthedSocket } from '../socket.types';
import { Server } from 'socket.io';
import { ChatEvents } from '../events';
import { ConversationService } from '../services/conversation.service';
import { ParticipantService } from '../services/participant.service';
import { sanitizeConversation } from '../sanitize';
import { CreateConversationInput } from '../dto/create-conversation.input';
import { UpdateConversationTitleInput } from '../dto/update-conversation-title.input';
import { ExecutionContextService } from '../services/execution-context.service';

@Injectable()
export class ConversationHandler {
  constructor(
    private readonly conversations: ConversationService,
    private readonly participants: ParticipantService,
    private readonly exec: ExecutionContextService,
  ) {}

  list(client: AuthedSocket) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runGeneral(client, async () => {
      const convos = await this.conversations.listConversationsForUser(user.id);
      client.emit(ChatEvents.CONVERSATION_LIST_DATA, {
        conversations: convos.map(sanitizeConversation),
      });
    });
  }

  create(client: AuthedSocket, body: CreateConversationInput, server: Server) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runGeneral(client, async () => {
      const convo = await this.conversations.createConversation(user.id, body);
      await client.join(convo.id);
      client.data.joinedRooms?.add(convo.id);
      client.emit(ChatEvents.CONVERSATION_CREATED, {
        conversation: sanitizeConversation(convo),
      });
      convo.participants
        .filter((p) => p.userId !== user.id)
        .forEach(() => {
          server.to(convo.id).emit(ChatEvents.CONVERSATION_UPDATED, {
            conversation: sanitizeConversation(convo),
          });
        });
    });
  }

  updateTitle(
    client: AuthedSocket,
    body: UpdateConversationTitleInput,
    server: Server,
  ) {
    const user = this.exec.ensureUser(client);
    if (!user) return;
    this.exec.runGeneral(client, async () => {
      const convo = await this.conversations.updateConversationTitle(
        body.conversationId,
        user.id,
        body.title,
      );
      server.to(convo.id).emit(ChatEvents.CONVERSATION_UPDATED, {
        conversation: sanitizeConversation(convo),
      });
    });
  }
}
