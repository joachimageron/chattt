import { Injectable } from '@nestjs/common';

interface RateEntry {
  windowStart: number;
  count: number;
}

@Injectable()
export class RateLimiterService {
  private readonly rateLimitMap: Map<string, RateEntry> = new Map();
  private readonly RATE_LIMIT_MAX = Number(
    process.env.CHAT_RATE_LIMIT_PER_MINUTE || 120,
  );
  private readonly WINDOW_MS = 60_000;
  private readonly CLEAN_INTERVAL_MS = 5 * 60_000; // 5 minutes
  private lastCleanup = Date.now();

  private cleanupIfNeeded(now: number) {
    if (now - this.lastCleanup < this.CLEAN_INTERVAL_MS) return;
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now - entry.windowStart >= this.WINDOW_MS) {
        this.rateLimitMap.delete(key);
      }
    }
    this.lastCleanup = now;
  }

  check(userId: string): boolean {
    const now = Date.now();
    this.cleanupIfNeeded(now);
    const entry = this.rateLimitMap.get(userId);
    if (!entry || now - entry.windowStart >= this.WINDOW_MS) {
      this.rateLimitMap.set(userId, { windowStart: now, count: 1 });
      return true;
    }
    if (entry.count >= this.RATE_LIMIT_MAX) return false;
    entry.count += 1;
    return true;
  }
}
