import { and, desc, eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { AppError } from "../../errors.js";
import { savingsGoals } from "../../db/schema.js";
import { requireAuth } from "../../utils/auth.js";
import { executeIdempotent } from "../../utils/idempotency.js";
import { isSupportedCurrency, resolveUserRegionalPreferences } from "../../utils/regional.js";
import { parseOrThrow } from "../../utils/validation.js";
import { goalCreateSchema, goalUpdateSchema, idParamSchema } from "./validation.js";

const parseMoney = (value: string): number => Number(value);

const buildGoalResponse = (row: {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  currency: string;
  targetDate: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const targetAmount = parseMoney(row.targetAmount);
  const currentAmount = parseMoney(row.currentAmount);
  const progressPercent = targetAmount > 0 ? Number(Math.min((currentAmount / targetAmount) * 100, 100).toFixed(2)) : 0;

  return {
    id: row.id,
    name: row.name,
    targetAmount,
    currentAmount,
    remainingAmount: Number(Math.max(targetAmount - currentAmount, 0).toFixed(2)),
    progressPercent,
    currency: row.currency,
    targetDate: row.targetDate?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    isCompleted: Boolean(row.closedAt) || currentAmount >= targetAmount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
};

export const registerGoalRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/goals", async (request) => {
    const identity = requireAuth(request);

    const rows = await ctx.db
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
        currency: savingsGoals.currency,
        targetDate: savingsGoals.targetDate,
        closedAt: savingsGoals.closedAt,
        createdAt: savingsGoals.createdAt,
        updatedAt: savingsGoals.updatedAt
      })
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, identity.userId))
      .orderBy(desc(savingsGoals.updatedAt));

    return {
      items: rows.map(buildGoalResponse)
    };
  });

  app.post("/api/v1/goals", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const body = parseOrThrow(goalCreateSchema, request.body);
        if (body.currency && !isSupportedCurrency(body.currency.toUpperCase())) {
          throw new AppError(400, "INVALID_CURRENCY", "Currency must be a supported 3-letter ISO code.");
        }
        const regionalPreferences = await resolveUserRegionalPreferences(ctx.db, identity.userId, {
          timezone: "UTC",
          locale: "en-IN",
          currency: ctx.env.APP_CURRENCY
        });
        const normalizedCurrency = (body.currency ?? regionalPreferences.currency).toUpperCase();

        const closedAt = body.currentAmount >= body.targetAmount ? new Date() : null;

        const rows = await ctx.db
          .insert(savingsGoals)
          .values({
            userId: identity.userId,
            name: body.name,
            targetAmount: body.targetAmount.toFixed(2),
            currentAmount: body.currentAmount.toFixed(2),
            currency: normalizedCurrency,
            targetDate: body.targetDate,
            closedAt,
            updatedAt: new Date()
          })
          .returning({
            id: savingsGoals.id,
            name: savingsGoals.name,
            targetAmount: savingsGoals.targetAmount,
            currentAmount: savingsGoals.currentAmount,
            currency: savingsGoals.currency,
            targetDate: savingsGoals.targetDate,
            closedAt: savingsGoals.closedAt,
            createdAt: savingsGoals.createdAt,
            updatedAt: savingsGoals.updatedAt
          });

        await ctx.auditService.log({
          userId: identity.userId,
          action: "goal.create",
          entityType: "goal",
          entityId: rows[0].id,
          requestId: request.id,
          ipAddress: request.ip
        });

        return {
          item: buildGoalResponse(rows[0])
        };
      }
    });
  });

  app.patch("/api/v1/goals/:id", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const params = parseOrThrow(idParamSchema, request.params);
        const body = parseOrThrow(goalUpdateSchema, request.body);

        const existingRows = await ctx.db
          .select()
          .from(savingsGoals)
          .where(and(eq(savingsGoals.id, params.id), eq(savingsGoals.userId, identity.userId)))
          .limit(1);

        const existing = existingRows[0];
        if (!existing) {
          throw new AppError(404, "GOAL_NOT_FOUND", "Goal not found.");
        }

        if (body.currency && !isSupportedCurrency(body.currency.toUpperCase())) {
          throw new AppError(400, "INVALID_CURRENCY", "Currency must be a supported 3-letter ISO code.");
        }

        const nextTarget = body.targetAmount ?? Number(existing.targetAmount);
        const nextCurrent = body.currentAmount ?? Number(existing.currentAmount);

        const nextClosedAt = nextCurrent >= nextTarget ? existing.closedAt ?? new Date() : null;

        const rows = await ctx.db
          .update(savingsGoals)
          .set({
            name: body.name ?? existing.name,
            targetAmount: body.targetAmount !== undefined ? body.targetAmount.toFixed(2) : existing.targetAmount,
            currentAmount: body.currentAmount !== undefined ? body.currentAmount.toFixed(2) : existing.currentAmount,
            currency: body.currency ? body.currency.toUpperCase() : existing.currency,
            targetDate: body.targetDate === undefined ? existing.targetDate : body.targetDate,
            closedAt: nextClosedAt,
            updatedAt: new Date()
          })
          .where(and(eq(savingsGoals.id, params.id), eq(savingsGoals.userId, identity.userId)))
          .returning({
            id: savingsGoals.id,
            name: savingsGoals.name,
            targetAmount: savingsGoals.targetAmount,
            currentAmount: savingsGoals.currentAmount,
            currency: savingsGoals.currency,
            targetDate: savingsGoals.targetDate,
            closedAt: savingsGoals.closedAt,
            createdAt: savingsGoals.createdAt,
            updatedAt: savingsGoals.updatedAt
          });

        await ctx.auditService.log({
          userId: identity.userId,
          action: "goal.update",
          entityType: "goal",
          entityId: params.id,
          requestId: request.id,
          ipAddress: request.ip
        });

        return {
          item: buildGoalResponse(rows[0])
        };
      }
    });
  });

  app.delete("/api/v1/goals/:id", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const params = parseOrThrow(idParamSchema, request.params);

        const rows = await ctx.db
          .delete(savingsGoals)
          .where(and(eq(savingsGoals.id, params.id), eq(savingsGoals.userId, identity.userId)))
          .returning({ id: savingsGoals.id });

        if (!rows[0]) {
          throw new AppError(404, "GOAL_NOT_FOUND", "Goal not found.");
        }

        await ctx.auditService.log({
          userId: identity.userId,
          action: "goal.delete",
          entityType: "goal",
          entityId: params.id,
          requestId: request.id,
          ipAddress: request.ip
        });

        return { success: true };
      }
    });
  });
};
