import { and, asc, eq, isNull, or } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { categories } from "../../db/schema.js";
import { requireAuth } from "../../utils/auth.js";

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
};
