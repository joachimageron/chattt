import { Injectable, Logger } from '@nestjs/common';
import { ChatEvents } from '../events';
import { AuthedSocket } from '../socket.types';
import { User } from '../../users/entities/user.entity';
import { ChatErrorCode, mapErrorToChatError } from '../chat-errors';

interface RateEntry {
  windowStart: number;
  count: number;
}

@Injectable()
export class ChatFlowService {
  private readonly logger = new Logger(ChatFlowService.name);
  private rateLimitMap: Map<string, RateEntry> = new Map();
  private readonly RATE_LIMIT_MAX = Number(
    process.env.CHAT_RATE_LIMIT_PER_MINUTE || 120,
  );
  private readonly WINDOW_MS = 60_000;

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

  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(userId);
    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      this.rateLimitMap.set(userId, { windowStart: now, count: 1 });
      return true;
    }
    if (entry.count >= this.RATE_LIMIT_MAX) return false;
    entry.count += 1;
    return true;
  }

  async runSafe<T>(
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
