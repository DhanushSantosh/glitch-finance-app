import { and, asc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { budgetPlans, categories } from "../../db/schema.js";
import { AppError } from "../../errors.js";
import { requireAuth } from "../../utils/auth.js";
import { executeIdempotent } from "../../utils/idempotency.js";
import { parseOrThrow } from "../../utils/validation.js";
import { categoryCreateSchema, categoryIdParamSchema, categoryUpdateSchema } from "./validation.js";

const normalizeCategoryName = (value: string): string => value.trim().replace(/\s+/g, " ");

const findDuplicateCategory = async (
  ctx: AppContext,
  input: {
    userId: string;
    name: string;
    direction: "debit" | "credit" | "transfer";
    ignoreCategoryId?: string;
  }
): Promise<boolean> => {
  const normalizedName = normalizeCategoryName(input.name).toLowerCase();

  const conditions = [
    eq(categories.direction, input.direction),
    or(isNull(categories.userId), eq(categories.userId, input.userId)),
    sql`lower(${categories.name}) = ${normalizedName}`
  ];

  if (input.ignoreCategoryId) {
    conditions.push(ne(categories.id, input.ignoreCategoryId));
  }

  const rows = await ctx.db
    .select({ id: categories.id })
    .from(categories)
    .where(and(...conditions))
    .limit(1);

  return Boolean(rows[0]);
};

export const registerCategoryRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/categories", async (request) => {
    const identity = requireAuth(request);

    const rows = await ctx.db
      .select({
        id: categories.id,
        name: categories.name,
        direction: categories.direction,
        userId: categories.userId
      })
      .from(categories)
      .where(and(or(isNull(categories.userId), eq(categories.userId, identity.userId))))
      .orderBy(asc(categories.name));

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        direction: row.direction,
        isDefault: row.userId === null
      }))
    };
  });

  app.post("/api/v1/categories", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const body = parseOrThrow(categoryCreateSchema, request.body);
        const name = normalizeCategoryName(body.name);

        if (
          await findDuplicateCategory(ctx, {
            userId: identity.userId,
            name,
            direction: body.direction
          })
        ) {
          throw new AppError(409, "CATEGORY_NAME_CONFLICT", "Category already exists for this direction.");
        }

        const rows = await ctx.db
          .insert(categories)
          .values({
            userId: identity.userId,
            name,
            direction: body.direction
          })
          .returning({
            id: categories.id,
            name: categories.name,
            direction: categories.direction,
            userId: categories.userId
          });

        await ctx.auditService.log({
          userId: identity.userId,
          action: "category.create",
          entityType: "category",
          entityId: rows[0].id,
          metadata: { direction: body.direction },
          requestId: request.id,
          ipAddress: request.ip
        });

        return {
          item: {
            id: rows[0].id,
            name: rows[0].name,
            direction: rows[0].direction,
            isDefault: rows[0].userId === null
          }
        };
      }
    });
  });

  app.patch("/api/v1/categories/:id", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const params = parseOrThrow(categoryIdParamSchema, request.params);
        const body = parseOrThrow(categoryUpdateSchema, request.body);

        const existingRows = await ctx.db
          .select({
            id: categories.id,
            name: categories.name,
            direction: categories.direction
          })
          .from(categories)
          .where(and(eq(categories.id, params.id), eq(categories.userId, identity.userId)))
          .limit(1);

        const existing = existingRows[0];
        if (!existing) {
          throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found.");
        }

        const nextName = body.name ? normalizeCategoryName(body.name) : existing.name;
        const nextDirection = body.direction ?? existing.direction;

        if (
          await findDuplicateCategory(ctx, {
            userId: identity.userId,
            name: nextName,
            direction: nextDirection,
            ignoreCategoryId: existing.id
          })
        ) {
          throw new AppError(409, "CATEGORY_NAME_CONFLICT", "Category already exists for this direction.");
        }

        if (body.direction && body.direction !== existing.direction) {
          const budgetRows = await ctx.db
            .select({ id: budgetPlans.id })
            .from(budgetPlans)
            .where(and(eq(budgetPlans.userId, identity.userId), eq(budgetPlans.categoryId, existing.id)))
            .limit(1);

          if (budgetRows[0]) {
            throw new AppError(409, "CATEGORY_IN_USE_BUDGET", "Cannot change direction while a budget uses this category.");
          }
        }

        const rows = await ctx.db
          .update(categories)
          .set({
            name: nextName,
            direction: nextDirection
          })
          .where(and(eq(categories.id, existing.id), eq(categories.userId, identity.userId)))
          .returning({
            id: categories.id,
            name: categories.name,
            direction: categories.direction,
            userId: categories.userId
          });

        await ctx.auditService.log({
          userId: identity.userId,
          action: "category.update",
          entityType: "category",
          entityId: existing.id,
          metadata: {
            nameChanged: nextName !== existing.name,
            directionChanged: nextDirection !== existing.direction
          },
          requestId: request.id,
          ipAddress: request.ip
        });

        return {
          item: {
            id: rows[0].id,
            name: rows[0].name,
            direction: rows[0].direction,
            isDefault: rows[0].userId === null
          }
        };
      }
    });
  });

  app.delete("/api/v1/categories/:id", async (request, reply) => {
    const identity = requireAuth(request);
    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const params = parseOrThrow(categoryIdParamSchema, request.params);

        const existingRows = await ctx.db
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.id, params.id), eq(categories.userId, identity.userId)))
          .limit(1);

        if (!existingRows[0]) {
          throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found.");
        }

        const budgetRows = await ctx.db
          .select({ id: budgetPlans.id })
          .from(budgetPlans)
          .where(and(eq(budgetPlans.userId, identity.userId), eq(budgetPlans.categoryId, params.id)))
          .limit(1);

        if (budgetRows[0]) {
          throw new AppError(409, "CATEGORY_IN_USE_BUDGET", "Cannot delete category while a budget uses it.");
        }

        await ctx.db.delete(categories).where(and(eq(categories.id, params.id), eq(categories.userId, identity.userId)));

        await ctx.auditService.log({
          userId: identity.userId,
          action: "category.delete",
          entityType: "category",
          entityId: params.id,
          requestId: request.id,
          ipAddress: request.ip
        });

        return { success: true };
      }
    });
  });
};
