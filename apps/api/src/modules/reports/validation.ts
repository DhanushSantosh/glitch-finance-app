import { z } from "zod";
import { budgetMonthSchema, getCurrentMonthToken, getMonthWindow } from "../budgets/validation.js";

export const reportSummaryQuerySchema = z.object({
  month: budgetMonthSchema.optional(),
  currency: z.string().length(3).optional(),
  top: z.coerce.number().int().min(1).max(10).default(5)
});

export const reportExportQuerySchema = reportSummaryQuerySchema.extend({
  format: z.enum(["csv", "pdf"]).default("csv")
});

export const resolveReportMonth = (month?: string): string => month ?? getCurrentMonthToken();

export { getMonthWindow };
