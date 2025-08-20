import { Injectable, Logger } from '@nestjs/common';
import { ChatEvents } from '../events';
import { AuthedSocket } from '../socket.types';
import { User } from '../../users/entities/user.entity';
import { ChatErrorCode, mapErrorToChatError } from '../chat-errors';

@Injectable()
export class ExecutionContextService {
  private readonly logger = new Logger(ExecutionContextService.name);

  ensureUser(client: AuthedSocket): User | null {
    const user = client.data.user;
    if (!user) {
      client.emit(ChatEvents.ERROR, {
        error: {
          code: ChatErrorCode.UNAUTHENTICATED,
          message: 'unauthenticated',
          context: 'auth',
        },
      });
      this.logger.warn(`Unauthenticated event from socket ${client.id}`);
      return null;
    }
    return user;
  }

  private async runSafe<T>(
    client: AuthedSocket,
    action: () => Promise<T>,
    onError: (err: unknown) => void,
  ): Promise<T | undefined> {
    try {
      return await action();
    } catch (e) {
      onError(e);
      return undefined;
    }
  }

  runGeneral(client: AuthedSocket, action: () => Promise<void>): void {
    void this.runSafe(client, action, (e) => {
      const payload = mapErrorToChatError(e, 'general');
      client.emit(ChatEvents.ERROR, { error: payload });
    });
  }

  runMessage(
    client: AuthedSocket,
    action: () => Promise<void>,
    buildPayload: () => Record<string, unknown> = () => ({}),
  ): void {
    void this.runSafe(client, action, (e) => {
      const base = buildPayload();
      const payload = mapErrorToChatError(e, 'message', base);
      client.emit(ChatEvents.MESSAGE_ERROR, { error: payload });
    });
  }
}
