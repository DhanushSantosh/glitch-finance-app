import { and, eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { consents } from "../../db/schema.js";
import { AppError } from "../../errors.js";
import { requireAuth } from "../../utils/auth.js";
import { parseOrThrow } from "../../utils/validation.js";
import { parseBankingSmsBatch } from "./sms-parser.js";
import { smsScanRequestSchema } from "./validation.js";

export const registerImportRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.post("/api/v1/imports/sms/scan", async (request) => {
    const identity = requireAuth(request);

    if (!ctx.env.SMS_IMPORT_SCAN_ENABLED) {
      throw new AppError(
        409,
        "SMS_IMPORT_DISABLED",
        "SMS import scan is disabled for this environment. Keep using manual tracking."
      );
    }

    const consentRows = await ctx.db
      .select({ enabled: consents.enabled })
      .from(consents)
      .where(and(eq(consents.userId, identity.userId), eq(consents.consentKey, "sms_import")))
      .limit(1);

    if (!consentRows[0]?.enabled) {
      throw new AppError(
        403,
        "SMS_IMPORT_CONSENT_REQUIRED",
        "SMS import consent is required before scanning banking messages."
      );
    }

    const body = parseOrThrow(smsScanRequestSchema, request.body);
    const items = parseBankingSmsBatch(body.messages);

    await ctx.auditService.log({
      userId: identity.userId,
      action: "import.sms_scan_requested",
      entityType: "import_job",
      metadata: {
        scannedCount: body.messages.length,
        extractedCount: items.length
      },
      requestId: request.id,
      ipAddress: request.ip
    });

    return {
      scannedCount: body.messages.length,
      extractedCount: items.length,
      items
    };
  });
};
