import { Injectable, Logger } from '@nestjs/common';
import { ChatEvents } from '../events';
import { AuthedSocket } from '../socket.types';
import { User } from '../../users/entities/user.entity';

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
      client.emit(ChatEvents.ERROR, { message: 'unauthenticated' });
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
      const message = (e as Error)?.message || 'unknown_error';
      client.emit(ChatEvents.ERROR, { message });
    });
  }

  runMessage(
    client: AuthedSocket,
    action: () => Promise<void>,
    buildPayload: () => Record<string, unknown> = () => ({}),
  ): void {
    void this.runSafe(client, action, (e) => {
      const error = (e as Error)?.message || 'unknown_error';
      client.emit(ChatEvents.MESSAGE_ERROR, { error, ...buildPayload() });
    });
  }
}
