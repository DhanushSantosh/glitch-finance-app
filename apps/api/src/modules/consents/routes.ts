import { and, eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppContext } from "../../context.js";
import { consents } from "../../db/schema.js";
import { requireAuth } from "../../utils/auth.js";
import { parseOrThrow } from "../../utils/validation.js";

const intentSchema = z.object({
  enabled: z.boolean()
});

export const registerConsentRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/consents/sms-import", async (request) => {
    const identity = requireAuth(request);

    const rows = await ctx.db
      .select({ enabled: consents.enabled, legalTextVersion: consents.legalTextVersion, capturedAt: consents.capturedAt })
      .from(consents)
      .where(and(eq(consents.userId, identity.userId), eq(consents.consentKey, "sms_import")))
      .limit(1);

    const consent = rows[0];

    return {
      consentKey: "sms_import",
      enabled: consent?.enabled ?? false,
      legalTextVersion: consent?.legalTextVersion ?? ctx.env.SMS_DISCLOSURE_VERSION,
      capturedAt: consent?.capturedAt?.toISOString() ?? null,
      featureAvailable: false
    };
  });

  app.post("/api/v1/consents/sms-import-intent", async (request) => {
    const identity = requireAuth(request);
    const body = parseOrThrow(intentSchema, request.body);

    await ctx.db
      .insert(consents)
      .values({
        userId: identity.userId,
        consentKey: "sms_import",
        enabled: false,
        legalTextVersion: ctx.env.SMS_DISCLOSURE_VERSION,
        capturedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [consents.userId, consents.consentKey],
        set: {
          enabled: false,
          legalTextVersion: ctx.env.SMS_DISCLOSURE_VERSION,
          capturedAt: new Date()
        }
      });

    await ctx.auditService.log({
      userId: identity.userId,
      action: "consent.sms_import_intent",
      entityType: "consent",
      entityId: "sms_import",
      metadata: {
        requestedEnabled: body.enabled,
        featureAvailable: false
      },
      requestId: request.id,
      ipAddress: request.ip
    });

    return {
      acknowledged: true,
      featureAvailable: false,
      enabled: false,
      requestedEnabled: body.enabled,
      legalTextVersion: ctx.env.SMS_DISCLOSURE_VERSION
    };
  });
};
