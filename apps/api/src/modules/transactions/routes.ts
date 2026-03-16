import { and, asc, desc, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppContext } from "../../context.js";
import { categories, transactions } from "../../db/schema.js";
import { AppError } from "../../errors.js";
import { requireAuth } from "../../utils/auth.js";
import { executeIdempotent } from "../../utils/idempotency.js";
import { isSupportedCurrency, resolveUserRegionalPreferences } from "../../utils/regional.js";
import { parseOrThrow } from "../../utils/validation.js";
import { suggestCategoryIdForTransaction } from "./auto-categorize.js";
import { listQuerySchema, normalizeTransactionPayload, transactionInputSchema, transactionUpdateSchema } from "./validation.js";

const idParamSchema = z.object({
  id: z.string().uuid()
});

const resolveCategoryForTransaction = async (
  ctx: AppContext,
  input: {
    userId: string;
    categoryId: string;
    transactionDirection: "debit" | "credit" | "transfer";
  }
): Promise<void> => {
  const rows = await ctx.db
    .select({
      id: categories.id,
      direction: categories.direction
    })
    .from(categories)
    .where(and(eq(categories.id, input.categoryId), or(eq(categories.userId, input.userId), isNull(categories.userId))))
    .limit(1);

  const category = rows[0];
  if (!category) {
    throw new AppError(400, "INVALID_CATEGORY", "Category does not belong to the user.");
  }

  if (category.direction !== input.transactionDirection && category.direction !== "transfer") {
    throw new AppError(400, "INVALID_CATEGORY_DIRECTION", "Category direction is incompatible with transaction direction.");
  }
};

const toApiTransaction = (row: {
  id: string;
  categoryId: string | null;
  direction: "debit" | "credit" | "transfer";
  amount: string;
  currency: string;
  counterparty: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
}) => ({
  id: row.id,
  categoryId: row.categoryId,
  categoryName: row.categoryName,
  direction: row.direction,
  amount: Number(row.amount),
  currency: row.currency,
  counterparty: row.counterparty,
  note: row.note,
  occurredAt: row.occurredAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const registerTransactionRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/transactions", async (request) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(listQuerySchema, request.query);

    const conditions = [eq(transactions.userId, identity.userId)];

    if (query.direction) {
      conditions.push(eq(transactions.direction, query.direction));
    }
    if (query.categoryId) {
      conditions.push(eq(transactions.categoryId, query.categoryId));
    }
    if (query.from) {
      conditions.push(gte(transactions.occurredAt, query.from));
    }
    if (query.to) {
      conditions.push(lte(transactions.occurredAt, query.to));
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(or(ilike(transactions.counterparty, pattern), ilike(transactions.note, pattern))!);
    }

    const primaryOrder =
      query.sortBy === "amount"
        ? query.sortOrder === "asc"
          ? asc(transactions.amount)
          : desc(transactions.amount)
        : query.sortOrder === "asc"
          ? asc(transactions.occurredAt)
          : desc(transactions.occurredAt);
    const occurredAtOrder = query.sortOrder === "asc" ? asc(transactions.occurredAt) : desc(transactions.occurredAt);
    const idOrder = query.sortOrder === "asc" ? asc(transactions.id) : desc(transactions.id);

    const rows = await ctx.db
      .select({
        id: transactions.id,
        categoryId: transactions.categoryId,
        direction: transactions.direction,
        amount: transactions.amount,
        currency: transactions.currency,
        counterparty: transactions.counterparty,
        note: transactions.note,
        occurredAt: transactions.occurredAt,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        categoryName: categories.name
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(...conditions))
      .orderBy(primaryOrder, occurredAtOrder, idOrder)
      .limit(query.pageSize + 1)
      .offset((query.page - 1) * query.pageSize);

    const hasMore = rows.length > query.pageSize;
    const visible = hasMore ? rows.slice(0, query.pageSize) : rows;

    return {
      items: visible.map(toApiTransaction),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        hasMore,
        nextPage: hasMore ? query.page + 1 : null
      }
    };
  });

  app.post("/api/v1/transactions", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const body = parseOrThrow(transactionInputSchema, request.body);
        if (body.currency && !isSupportedCurrency(body.currency.toUpperCase())) {
          throw new AppError(400, "INVALID_CURRENCY", "Currency must be a supported 3-letter ISO code.");
        }
        const regionalPreferences = await resolveUserRegionalPreferences(ctx.db, identity.userId, {
          timezone: "UTC",
          locale: "en-IN",
          currency: ctx.env.APP_CURRENCY
        });
        const normalizedPayload = normalizeTransactionPayload(body, regionalPreferences.currency);
        let resolvedCategoryId = normalizedPayload.categoryId;

        if (!resolvedCategoryId) {
          resolvedCategoryId = await suggestCategoryIdForTransaction({
            db: ctx.db,
            userId: identity.userId,
            direction: normalizedPayload.direction,
            counterparty: normalizedPayload.counterparty,
            note: normalizedPayload.note
          });
        }

        if (resolvedCategoryId) {
          await resolveCategoryForTransaction(ctx, {
            userId: identity.userId,
            categoryId: resolvedCategoryId,
            transactionDirection: normalizedPayload.direction
          });
        }

        const inserted = await ctx.db
          .insert(transactions)
          .values({
            userId: identity.userId,
            categoryId: resolvedCategoryId,
            direction: normalizedPayload.direction,
            source: "manual",
            amount: normalizedPayload.amount,
            currency: normalizedPayload.currency,
            counterparty: normalizedPayload.counterparty,
            note: normalizedPayload.note,
            occurredAt: normalizedPayload.occurredAt,
            updatedAt: new Date()
          })
          .returning({
            id: transactions.id,
            categoryId: transactions.categoryId,
            direction: transactions.direction,
            amount: transactions.amount,
            currency: transactions.currency,
            counterparty: transactions.counterparty,
            note: transactions.note,
            occurredAt: transactions.occurredAt,
            createdAt: transactions.createdAt,
            updatedAt: transactions.updatedAt
          });

        await ctx.auditService.log({
          userId: identity.userId,
          action: "transaction.create",
          entityType: "transaction",
          entityId: inserted[0].id,
          metadata: { source: "manual" },
          requestId: request.id,
          ipAddress: request.ip
        });

        return {
          item: {
            ...toApiTransaction({ ...inserted[0], categoryName: null })
          }
        };
      }
    });
  });

  app.patch("/api/v1/transactions/:id", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const params = parseOrThrow(idParamSchema, request.params);
        const body = parseOrThrow(transactionUpdateSchema, request.body);

        const existingRows = await ctx.db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, params.id), eq(transactions.userId, identity.userId)))
          .limit(1);

        const existing = existingRows[0];
        if (!existing) {
          throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction not found.");
        }

        if (body.currency && !isSupportedCurrency(body.currency.toUpperCase())) {
          throw new AppError(400, "INVALID_CURRENCY", "Currency must be a supported 3-letter ISO code.");
        }

        const nextDirection = body.direction ?? existing.direction;
        const hasCategoryPatch = Object.prototype.hasOwnProperty.call(body, "categoryId");

        const nextCategoryId = hasCategoryPatch ? body.categoryId ?? null : existing.categoryId;

        if (nextCategoryId) {
          await resolveCategoryForTransaction(ctx, {
            userId: identity.userId,
            categoryId: nextCategoryId,
            transactionDirection: nextDirection
          });
        }

        const normalizedUpdate = normalizeTransactionPayload({
          categoryId: nextCategoryId,
          direction: nextDirection,
          amount: body.amount ?? Number(existing.amount),
          currency: body.currency ?? existing.currency,
          counterparty: body.counterparty ?? existing.counterparty ?? undefined,
          note: body.note ?? existing.note ?? undefined,
          occurredAt: body.occurredAt ?? existing.occurredAt
        }, existing.currency);

        const updatedRows = await ctx.db
          .update(transactions)
          .set({
            categoryId: normalizedUpdate.categoryId,
            direction: normalizedUpdate.direction,
            amount: normalizedUpdate.amount,
            currency: normalizedUpdate.currency,
            counterparty: normalizedUpdate.counterparty ?? null,
            note: normalizedUpdate.note ?? null,
            occurredAt: normalizedUpdate.occurredAt,
            updatedAt: new Date()
          })
          .where(and(eq(transactions.id, params.id), eq(transactions.userId, identity.userId)))
          .returning({
            id: transactions.id,
            categoryId: transactions.categoryId,
            direction: transactions.direction,
            amount: transactions.amount,
            currency: transactions.currency,
            counterparty: transactions.counterparty,
            note: transactions.note,
            occurredAt: transactions.occurredAt,
            createdAt: transactions.createdAt,
            updatedAt: transactions.updatedAt
          });

        await ctx.auditService.log({
          userId: identity.userId,
          action: "transaction.update",
          entityType: "transaction",
          entityId: params.id,
          requestId: request.id,
          ipAddress: request.ip
        });

        return {
          item: toApiTransaction({ ...updatedRows[0], categoryName: null })
        };
      }
    });
  });

  app.delete("/api/v1/transactions/:id", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const params = parseOrThrow(idParamSchema, request.params);

        const deletedRows = await ctx.db
          .delete(transactions)
          .where(and(eq(transactions.id, params.id), eq(transactions.userId, identity.userId)))
          .returning({ id: transactions.id });

        if (!deletedRows[0]) {
          throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction not found.");
        }

        await ctx.auditService.log({
          userId: identity.userId,
          action: "transaction.delete",
          entityType: "transaction",
          entityId: params.id,
          requestId: request.id,
          ipAddress: request.ip
        });

        return { success: true };
      }
    });
  });
};
