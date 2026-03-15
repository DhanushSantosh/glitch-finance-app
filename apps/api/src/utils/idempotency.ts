import { createHash } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, lte } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { idempotencyKeys } from "../db/schema.js";
import { AppError } from "../errors.js";

const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_MAX_KEY_LENGTH = 128;
const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7E]+$/;

const stableSerialize = (input: unknown): string => {
  if (input === null || typeof input !== "object") {
    return JSON.stringify(input);
  }

  if (Array.isArray(input)) {
    return `[${input.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const objectValue = input as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const serializedEntries = keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(objectValue[key])}`);
  return `{${serializedEntries.join(",")}}`;
};

const getHeaderValue = (request: FastifyRequest, headerName: string): string | null => {
  const rawHeader = request.headers[headerName];

  if (!rawHeader) {
    return null;
  }

  if (Array.isArray(rawHeader)) {
    if (rawHeader.length !== 1) {
      throw new AppError(400, "INVALID_IDEMPOTENCY_KEY", "Provide a single idempotency key value.");
    }
    return rawHeader[0];
  }

  return rawHeader;
};

const normalizeIdempotencyKey = (request: FastifyRequest): string | null => {
  const rawKey = getHeaderValue(request, IDEMPOTENCY_HEADER);
  if (!rawKey) {
    return null;
  }

  const key = rawKey.trim();
  if (key.length < 8 || key.length > IDEMPOTENCY_MAX_KEY_LENGTH || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new AppError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency key must be 8-128 visible ASCII characters without whitespace."
    );
  }

  return key;
};

const getRequestRoute = (request: FastifyRequest): string => {
  const route = request.routeOptions.url;
  if (typeof route === "string" && route.length > 0) {
    return route;
  }

  return request.url.split("?")[0] ?? request.url;
};

const getRequestHash = (request: FastifyRequest): string => {
  const fingerprintPayload = {
    params: request.params ?? null,
    query: request.query ?? null,
    body: request.body ?? null
  };

  return createHash("sha256").update(stableSerialize(fingerprintPayload)).digest("hex");
};

type IdempotentExecutorInput<TResponse> = {
  ctx: AppContext;
  request: FastifyRequest;
  reply: FastifyReply;
  userId: string;
  execute: () => Promise<TResponse>;
};

export const executeIdempotent = async <TResponse>({
  ctx,
  request,
  reply,
  userId,
  execute
}: IdempotentExecutorInput<TResponse>): Promise<TResponse> => {
  const idempotencyKey = normalizeIdempotencyKey(request);
  if (!idempotencyKey) {
    return execute();
  }

  const requestMethod = request.method.toUpperCase();
  const requestRoute = getRequestRoute(request);
  const requestHash = getRequestHash(request);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_MS);

  await ctx.db
    .delete(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.requestMethod, requestMethod),
        eq(idempotencyKeys.requestRoute, requestRoute),
        eq(idempotencyKeys.key, idempotencyKey),
        lte(idempotencyKeys.expiresAt, now)
      )
    );

  const insertedRows = await ctx.db
    .insert(idempotencyKeys)
    .values({
      userId,
      requestMethod,
      requestRoute,
      key: idempotencyKey,
      requestHash,
      expiresAt
    })
    .onConflictDoNothing()
    .returning({ id: idempotencyKeys.id });

  if (insertedRows[0]) {
    const rowId = insertedRows[0].id;
    try {
      const responseBody = await execute();
      const responseStatus = reply.statusCode >= 100 ? reply.statusCode : 200;

      await ctx.db
        .update(idempotencyKeys)
        .set({
          responseStatus,
          responseBody,
          completedAt: new Date()
        })
        .where(eq(idempotencyKeys.id, rowId));

      return responseBody;
    } catch (error) {
      await ctx.db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, rowId));
      throw error;
    }
  }

  const existingRows = await ctx.db
    .select({
      requestHash: idempotencyKeys.requestHash,
      responseStatus: idempotencyKeys.responseStatus,
      responseBody: idempotencyKeys.responseBody,
      completedAt: idempotencyKeys.completedAt
    })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.requestMethod, requestMethod),
        eq(idempotencyKeys.requestRoute, requestRoute),
        eq(idempotencyKeys.key, idempotencyKey)
      )
    )
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new AppError(409, "IDEMPOTENCY_RACE_RETRY", "Could not confirm idempotent request state. Retry this request.");
  }

  if (existing.requestHash !== requestHash) {
    throw new AppError(
      409,
      "IDEMPOTENCY_KEY_CONFLICT",
      "Idempotency key has already been used for a different request payload."
    );
  }

  if (existing.completedAt && existing.responseStatus && existing.responseBody !== null) {
    reply.header("x-idempotent-replay", "true");
    reply.code(existing.responseStatus);
    return existing.responseBody as TResponse;
  }

  throw new AppError(
    409,
    "IDEMPOTENCY_IN_PROGRESS",
    "A request with this idempotency key is still being processed. Retry shortly."
  );
};
