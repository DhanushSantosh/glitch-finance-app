import { Redis } from "ioredis";
import { AppError } from "../errors.js";

type MemoryRecord = {
  count: number;
  expiresAt: number;
};

export class RateLimiter {
  private readonly memoryStore = new Map<string, MemoryRecord>();

  constructor(private readonly redis: Redis | null) {}

  async consume(key: string, maxRequests: number, windowSeconds: number): Promise<void> {
    const now = Date.now();

    if (this.redis && this.redis.status === "ready") {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      if (count > maxRequests) {
        throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
      }
      return;
    }

    const existing = this.memoryStore.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.memoryStore.set(key, {
        count: 1,
        expiresAt: now + windowSeconds * 1000
      });
      if (1 > maxRequests) {
        throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
      }
      return;
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
    }
  }
}
