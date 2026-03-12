import { and, asc, eq, gte, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { budgetPlans, categories, transactions } from "../../db/schema.js";
import { AppError } from "../../errors.js";
import { requireAuth } from "../../utils/auth.js";
import { parseOrThrow } from "../../utils/validation.js";
import {
  budgetCreateSchema,
  budgetListQuerySchema,
  budgetUpdateSchema,
  getCurrentMonthToken,
  getMonthWindow,
  idParamSchema
} from "./validation.js";

const parseMoney = (value: string): number => Number(value);

const calculateUtilization = (spentAmount: number, budgetAmount: number): number => {
  if (budgetAmount <= 0) {
    return 0;
  }

  return Number(((spentAmount / budgetAmount) * 100).toFixed(2));
};

export const registerBudgetRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/budgets", async (request) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(budgetListQuerySchema, request.query);
    const month = query.month ?? getCurrentMonthToken();
    const monthWindow = getMonthWindow(month);

    const plans = await ctx.db
      .select({
        id: budgetPlans.id,
        categoryId: budgetPlans.categoryId,
        categoryName: categories.name,
        month: budgetPlans.month,
        amount: budgetPlans.amount,
        currency: budgetPlans.currency,
        createdAt: budgetPlans.createdAt,
        updatedAt: budgetPlans.updatedAt
      })
      .from(budgetPlans)
      .innerJoin(categories, eq(categories.id, budgetPlans.categoryId))
      .where(and(eq(budgetPlans.userId, identity.userId), eq(budgetPlans.month, month)))
      .orderBy(asc(categories.name));

    const spentRows = await ctx.db
      .select({
        categoryId: transactions.categoryId,
        spentAmount: sql<string>`coalesce(sum(${transactions.amount}), 0)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, identity.userId),
          eq(transactions.direction, "debit"),
          isNotNull(transactions.categoryId),
          gte(transactions.occurredAt, monthWindow.start),
          lt(transactions.occurredAt, monthWindow.end)
        )
      )
      .groupBy(transactions.categoryId);

    const spentByCategory = new Map<string, number>();
    for (const row of spentRows) {
      if (row.categoryId) {
        spentByCategory.set(row.categoryId, parseMoney(row.spentAmount));
      }
    }

    const items = plans.map((plan) => {
      const amount = parseMoney(plan.amount);
      const spentAmount = spentByCategory.get(plan.categoryId) ?? 0;
      const remainingAmount = Number((amount - spentAmount).toFixed(2));

      return {
        id: plan.id,
        categoryId: plan.categoryId,
        categoryName: plan.categoryName,
        month: plan.month,
        amount,
        spentAmount,
        remainingAmount,
        utilizationPercent: calculateUtilization(spentAmount, amount),
        currency: plan.currency,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString()
      };
    });

    const totals = items.reduce(
      (accumulator, item) => {
        accumulator.budgeted += item.amount;
        accumulator.spent += item.spentAmount;
        accumulator.remaining += item.remainingAmount;
        return accumulator;
      },
      { budgeted: 0, spent: 0, remaining: 0 }
    );

    return {
      month,
      items,
      totals: {
        budgeted: Number(totals.budgeted.toFixed(2)),
        spent: Number(totals.spent.toFixed(2)),
        remaining: Number(totals.remaining.toFixed(2))
      }
    };
  });

  app.post("/api/v1/budgets", async (request) => {
    const identity = requireAuth(request);
    const body = parseOrThrow(budgetCreateSchema, request.body);

    const categoryRows = await ctx.db
      .select({ id: categories.id, direction: categories.direction })
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), or(eq(categories.userId, identity.userId), isNull(categories.userId))))
      .limit(1);

    const category = categoryRows[0];
    if (!category) {
      throw new AppError(400, "INVALID_CATEGORY", "Category does not belong to the user.");
    }

    if (category.direction !== "debit") {
      throw new AppError(400, "INVALID_BUDGET_CATEGORY", "Budgets can only be set for debit categories.");
    }

    const rows = await ctx.db
      .insert(budgetPlans)
      .values({
        userId: identity.userId,
        categoryId: body.categoryId,
        month: body.month,
        amount: body.amount.toFixed(2),
        currency: body.currency.toUpperCase(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [budgetPlans.userId, budgetPlans.categoryId, budgetPlans.month],
        set: {
          amount: body.amount.toFixed(2),
          currency: body.currency.toUpperCase(),
          updatedAt: new Date()
        }
      })
      .returning({
        id: budgetPlans.id,
        categoryId: budgetPlans.categoryId,
        month: budgetPlans.month,
        amount: budgetPlans.amount,
        currency: budgetPlans.currency,
        createdAt: budgetPlans.createdAt,
        updatedAt: budgetPlans.updatedAt
      });

    await ctx.auditService.log({
      userId: identity.userId,
      action: "budget.upsert",
      entityType: "budget",
      entityId: rows[0].id,
      requestId: request.id,
      ipAddress: request.ip
    });

    return {
      item: {
        id: rows[0].id,
        categoryId: rows[0].categoryId,
        month: rows[0].month,
        amount: parseMoney(rows[0].amount),
        currency: rows[0].currency,
        createdAt: rows[0].createdAt.toISOString(),
        updatedAt: rows[0].updatedAt.toISOString()
      }
    };
  });

  app.patch("/api/v1/budgets/:id", async (request) => {
    const identity = requireAuth(request);
    const params = parseOrThrow(idParamSchema, request.params);
    const body = parseOrThrow(budgetUpdateSchema, request.body);

    const existingRows = await ctx.db
      .select()
      .from(budgetPlans)
      .where(and(eq(budgetPlans.id, params.id), eq(budgetPlans.userId, identity.userId)))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      throw new AppError(404, "BUDGET_NOT_FOUND", "Budget not found.");
    }

    const nextCategoryId = body.categoryId ?? existing.categoryId;

    if (body.categoryId) {
      const categoryRows = await ctx.db
        .select({ id: categories.id, direction: categories.direction })
        .from(categories)
        .where(and(eq(categories.id, body.categoryId), or(eq(categories.userId, identity.userId), isNull(categories.userId))))
        .limit(1);

      const category = categoryRows[0];
      if (!category) {
        throw new AppError(400, "INVALID_CATEGORY", "Category does not belong to the user.");
      }

      if (category.direction !== "debit") {
        throw new AppError(400, "INVALID_BUDGET_CATEGORY", "Budgets can only be set for debit categories.");
      }
    }

    const rows = await ctx.db
      .update(budgetPlans)
      .set({
        categoryId: nextCategoryId,
        month: body.month ?? existing.month,
        amount: body.amount ? body.amount.toFixed(2) : existing.amount,
        currency: body.currency ? body.currency.toUpperCase() : existing.currency,
        updatedAt: new Date()
      })
      .where(and(eq(budgetPlans.id, params.id), eq(budgetPlans.userId, identity.userId)))
      .returning({
        id: budgetPlans.id,
        categoryId: budgetPlans.categoryId,
        month: budgetPlans.month,
        amount: budgetPlans.amount,
        currency: budgetPlans.currency,
        createdAt: budgetPlans.createdAt,
        updatedAt: budgetPlans.updatedAt
      });

    await ctx.auditService.log({
      userId: identity.userId,
      action: "budget.update",
      entityType: "budget",
      entityId: params.id,
      requestId: request.id,
      ipAddress: request.ip
    });

    return {
      item: {
        id: rows[0].id,
        categoryId: rows[0].categoryId,
        month: rows[0].month,
        amount: parseMoney(rows[0].amount),
        currency: rows[0].currency,
        createdAt: rows[0].createdAt.toISOString(),
        updatedAt: rows[0].updatedAt.toISOString()
      }
    };
  });

  app.delete("/api/v1/budgets/:id", async (request) => {
    const identity = requireAuth(request);
    const params = parseOrThrow(idParamSchema, request.params);

    const rows = await ctx.db
      .delete(budgetPlans)
      .where(and(eq(budgetPlans.id, params.id), eq(budgetPlans.userId, identity.userId)))
      .returning({ id: budgetPlans.id });

    if (!rows[0]) {
      throw new AppError(404, "BUDGET_NOT_FOUND", "Budget not found.");
    }

    await ctx.auditService.log({
      userId: identity.userId,
      action: "budget.delete",
      entityType: "budget",
      entityId: params.id,
      requestId: request.id,
      ipAddress: request.ip
    });

    return { success: true };
  });
};
