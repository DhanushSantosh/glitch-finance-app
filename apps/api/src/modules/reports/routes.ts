import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { requireAuth } from "../../utils/auth.js";
import { normalizeCurrency, resolveUserRegionalPreferences } from "../../utils/regional.js";
import { parseOrThrow } from "../../utils/validation.js";
import { getExchangeRateSnapshot } from "../fx/service.js";
import { buildReportCsv, buildReportPdf } from "./export.js";
import { buildReportSummary } from "./summary.js";
import { reportExportQuerySchema, reportSummaryQuerySchema, resolveReportMonth } from "./validation.js";

const buildExportFileName = (format: "csv" | "pdf", month: string): string => {
  const sanitized = month.replace(/[^0-9-]/g, "");
  return `velqora-report-${sanitized}.${format}`;
};

const encodeContentDisposition = (fileName: string): string =>
  `attachment; filename="${fileName.replace(/[\r\n"\\]/g, "")}"`;

export const registerReportRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/reports/summary", async (request) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(reportSummaryQuerySchema, request.query);
    const regionalPreferences = await resolveUserRegionalPreferences(ctx.db, identity.userId, {
      timezone: "UTC",
      locale: "en-IN",
      currency: ctx.env.APP_CURRENCY
    });
    const month = resolveReportMonth(query.month, regionalPreferences.timezone);
    const currency = normalizeCurrency(query.currency, regionalPreferences.currency);
    const exchangeSnapshot = await getExchangeRateSnapshot({
      redis: ctx.redis,
      logger: request.log,
      nodeEnv: ctx.env.NODE_ENV
    });

    return buildReportSummary({
      db: ctx.db,
      userId: identity.userId,
      month,
      currency,
      timezone: regionalPreferences.timezone,
      top: query.top,
      exchangeSnapshot
    });
  });

  app.get("/api/v1/reports/export", async (request, reply) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(reportExportQuerySchema, request.query);
    const regionalPreferences = await resolveUserRegionalPreferences(ctx.db, identity.userId, {
      timezone: "UTC",
      locale: "en-IN",
      currency: ctx.env.APP_CURRENCY
    });
    const month = resolveReportMonth(query.month, regionalPreferences.timezone);
    const currency = normalizeCurrency(query.currency, regionalPreferences.currency);
    const exchangeSnapshot = await getExchangeRateSnapshot({
      redis: ctx.redis,
      logger: request.log,
      nodeEnv: ctx.env.NODE_ENV
    });

    const summary = await buildReportSummary({
      db: ctx.db,
      userId: identity.userId,
      month,
      currency,
      timezone: regionalPreferences.timezone,
      top: query.top,
      exchangeSnapshot
    });

    const fileName = buildExportFileName(query.format, month);

    if (query.format === "pdf") {
      const pdfBuffer = buildReportPdf(summary);
      return reply
        .header("content-type", "application/pdf")
        .header("content-disposition", encodeContentDisposition(fileName))
        .send(pdfBuffer);
    }

    const csv = buildReportCsv(summary);
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", encodeContentDisposition(fileName))
      .send(csv);
  });
};
