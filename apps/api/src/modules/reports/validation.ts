import { z } from "zod";
import { budgetMonthSchema } from "../budgets/validation.js";
import { getCurrentMonthTokenForTimeZone } from "../../utils/regional.js";

export const reportSummaryQuerySchema = z.object({
  month: budgetMonthSchema.optional(),
  currency: z.string().length(3).optional(),
  top: z.coerce.number().int().min(1).max(10).default(5)
});

export const reportExportQuerySchema = reportSummaryQuerySchema.extend({
  format: z.enum(["csv", "pdf"]).default("csv")
});

export const resolveReportMonth = (month: string | undefined, timeZone: string): string => month ?? getCurrentMonthTokenForTimeZone(timeZone);
