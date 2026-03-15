import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors.js";
import { RateLimiter } from "./rate-limiter.js";

// ---------------------------------------------------------------------------
// In-memory path tests (redis = null)
// ---------------------------------------------------------------------------

describe("RateLimiter — in-memory fallback (redis = null)", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(null);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    // 3 requests allowed within a 10-second window capped at 3
    await expect(limiter.consume("key-allow", 3, 10)).resolves.toBeUndefined();
    await expect(limiter.consume("key-allow", 3, 10)).resolves.toBeUndefined();
    await expect(limiter.consume("key-allow", 3, 10)).resolves.toBeUndefined();
  });

  it("throws AppError 429 when limit is exceeded", async () => {
    const key = "key-exceed";
    const maxRequests = 2;
    const window = 60;

    await limiter.consume(key, maxRequests, window);
    await limiter.consume(key, maxRequests, window);

    // Third call exceeds the limit
    await expect(limiter.consume(key, maxRequests, window)).rejects.toThrow(AppError);

    try {
      await limiter.consume(key, maxRequests, window);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(429);
      expect((err as AppError).code).toBe("RATE_LIMITED");
    }
  });

  it("resets counter after the TTL window expires", async () => {
    const key = "key-reset";
    const maxRequests = 1;
    const windowSeconds = 5;

    // First request — OK
    await expect(limiter.consume(key, maxRequests, windowSeconds)).resolves.toBeUndefined();

    // Second request — exceeds limit
    await expect(limiter.consume(key, maxRequests, windowSeconds)).rejects.toThrow(AppError);

    // Advance time past the window
    vi.advanceTimersByTime((windowSeconds + 1) * 1000);

    // After TTL expiry the counter resets — request should succeed again
    await expect(limiter.consume(key, maxRequests, windowSeconds)).resolves.toBeUndefined();
  });

  it("different keys do not interfere with each other", async () => {
    const maxRequests = 1;
    const window = 60;

    await expect(limiter.consume("key-A", maxRequests, window)).resolves.toBeUndefined();
    // key-A is now at limit

    // key-B is a fresh key — should still be allowed
    await expect(limiter.consume("key-B", maxRequests, window)).resolves.toBeUndefined();

    // key-A second request — should throw
    await expect(limiter.consume("key-A", maxRequests, window)).rejects.toThrow(AppError);

    // key-B second request — should throw
    await expect(limiter.consume("key-B", maxRequests, window)).rejects.toThrow(AppError);
  });

  it("allows exactly maxRequests before blocking (boundary check)", async () => {
    const key = "key-boundary";
    const maxRequests = 5;
    const window = 60;

    // All 5 should succeed
    for (let i = 0; i < maxRequests; i++) {
      await expect(limiter.consume(key, maxRequests, window)).resolves.toBeUndefined();
    }

    // 6th should fail
    await expect(limiter.consume(key, maxRequests, window)).rejects.toThrow(AppError);
  });

  it("maxRequests = 0: every request is rejected immediately — 0 means allow nothing", async () => {
    // With maxRequests=0 the very first consume() must throw because zero requests are permitted.
    await expect(limiter.consume("key-zero", 0, 60)).rejects.toThrow(AppError);

    try {
      await limiter.consume("key-zero-2", 0, 60);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(429);
      expect((err as AppError).code).toBe("RATE_LIMITED");
    }
  });

  it("window of 0 seconds: expiresAt === now is treated as expired (<= check)", async () => {
    const key = "key-instant-expire";
    const maxRequests = 1;
    const windowSeconds = 0;

    // First call: creates entry with expiresAt = now + 0ms (already expired)
    await expect(limiter.consume(key, maxRequests, windowSeconds)).resolves.toBeUndefined();

    // Second call: expiresAt === now — the `<= now` check treats this as expired,
    // so the window resets and the request is allowed (starts a fresh window).
    await expect(limiter.consume(key, maxRequests, windowSeconds)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Redis path tests (mocked Redis)
// ---------------------------------------------------------------------------

describe("RateLimiter — Redis path", () => {
  const buildRedisMock = (incrReturn: number) => ({
    status: "ready" as const,
    incr: vi.fn().mockResolvedValue(incrReturn),
    expire: vi.fn().mockResolvedValue(1)
  });

  it("allows requests when count is under the limit", async () => {
    const redisMock = buildRedisMock(1); // count=1 after first incr
    const limiter = new RateLimiter(redisMock as never);

    await expect(limiter.consume("redis-key", 5, 60)).resolves.toBeUndefined();
    expect(redisMock.incr).toHaveBeenCalledWith("redis-key");
    expect(redisMock.expire).toHaveBeenCalledWith("redis-key", 60);
  });

  it("does not call expire when count > 1 (key already has a TTL)", async () => {
    const redisMock = buildRedisMock(2); // count=2 — key already exists
    const limiter = new RateLimiter(redisMock as never);

    await expect(limiter.consume("redis-key-existing", 5, 60)).resolves.toBeUndefined();
    expect(redisMock.incr).toHaveBeenCalled();
    // expire should NOT be called when count > 1
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it("throws AppError 429 when Redis count exceeds the limit", async () => {
    const redisMock = buildRedisMock(6); // count=6 exceeds maxRequests=5
    const limiter = new RateLimiter(redisMock as never);

    await expect(limiter.consume("redis-key-exceeded", 5, 60)).rejects.toThrow(AppError);

    try {
      await limiter.consume("redis-key-exceeded-2", 5, 60);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(429);
      expect((err as AppError).code).toBe("RATE_LIMITED");
    }
  });

  it("falls back to in-memory when Redis status is not ready", async () => {
    const redisMock = {
      status: "connecting" as const,
      incr: vi.fn(),
      expire: vi.fn()
    };

    const limiter = new RateLimiter(redisMock as never);

    // Should succeed using in-memory path without touching Redis
    await expect(limiter.consume("fallback-key", 5, 60)).resolves.toBeUndefined();
    expect(redisMock.incr).not.toHaveBeenCalled();
  });
});
