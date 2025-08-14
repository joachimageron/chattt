import { Injectable } from '@nestjs/common';
import { AuthedSocket } from '../socket.types';
import { ChatEvents } from '../events';
import { ParticipantService } from '../services/participant.service';
import { ChatFlowService } from '../services/chat-flow.service';

@Injectable()
export class PresenceHandler {
  constructor(
    private readonly participants: ParticipantService,
    private readonly flow: ChatFlowService,
  ) {}

  joinRoom(client: AuthedSocket, payload: { conversationId: string }) {
    const user = this.flow.ensureUser(client);
    if (!user) return;
    this.flow.runGeneral(client, async () => {
      await this.participants.ensureParticipant(
        payload.conversationId,
        user.id,
      );
      await client.join(payload.conversationId);
      client.data.joinedRooms?.add(payload.conversationId);
      client.emit(ChatEvents.ROOM_JOINED, {
        conversationId: payload.conversationId,
      });
    });
  }

  leaveRoom(client: AuthedSocket, payload: { conversationId: string }) {
    const { conversationId } = payload;
    void client.leave(conversationId);
    client.data.joinedRooms?.delete(conversationId);
    client.emit(ChatEvents.ROOM_LEFT, { conversationId });
  }

  typingStart(
    client: AuthedSocket,
    body: { conversationId: string },
    _server: any,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user || !body?.conversationId) return;
    this.flow.runGeneral(client, async () => {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      client.to(body.conversationId).emit(ChatEvents.TYPING_STARTED, {
        conversationId: body.conversationId,
        userId: user.id,
        at: new Date().toISOString(),
      });
    });
  }

  typingStop(
    client: AuthedSocket,
    body: { conversationId: string },
    _server: any,
  ) {
    const user = this.flow.ensureUser(client);
    if (!user || !body?.conversationId) return;
    this.flow.runGeneral(client, async () => {
      await this.participants.ensureParticipant(body.conversationId, user.id);
      client.to(body.conversationId).emit(ChatEvents.TYPING_STOPPED, {
        conversationId: body.conversationId,
        userId: user.id,
        at: new Date().toISOString(),
      });
    });
  }
}
