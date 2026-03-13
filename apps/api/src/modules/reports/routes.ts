import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { requireAuth } from "../../utils/auth.js";
import { parseOrThrow } from "../../utils/validation.js";
import { buildReportCsv, buildReportPdf } from "./export.js";
import { buildReportSummary } from "./summary.js";
import { reportExportQuerySchema, reportSummaryQuerySchema, resolveReportMonth } from "./validation.js";

const buildExportFileName = (format: "csv" | "pdf", month: string): string => `glitch-report-${month}.${format}`;

export const registerReportRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/reports/summary", async (request) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(reportSummaryQuerySchema, request.query);
    const month = resolveReportMonth(query.month);
    const currency = (query.currency ?? ctx.env.APP_CURRENCY).toUpperCase();

    return buildReportSummary({
      db: ctx.db,
      userId: identity.userId,
      month,
      currency,
      top: query.top
    });
  });

  app.get("/api/v1/reports/export", async (request, reply) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(reportExportQuerySchema, request.query);
    const month = resolveReportMonth(query.month);
    const currency = (query.currency ?? ctx.env.APP_CURRENCY).toUpperCase();

    const summary = await buildReportSummary({
      db: ctx.db,
      userId: identity.userId,
      month,
      currency,
      top: query.top
    });

    const fileName = buildExportFileName(query.format, month);

    if (query.format === "pdf") {
      const pdfBuffer = buildReportPdf(summary);
      return reply
        .header("content-type", "application/pdf")
        .header("content-disposition", `attachment; filename=\"${fileName}\"`)
        .send(pdfBuffer);
    }

    const csv = buildReportCsv(summary);
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename=\"${fileName}\"`)
      .send(csv);
  });
};

