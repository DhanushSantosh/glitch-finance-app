import { z } from "zod";
import { TransactionDirection } from "../../db/schema.js";

export const transactionInputSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  direction: z.enum(["debit", "credit", "transfer"]),
  amount: z.coerce.number().positive().finite(),
  currency: z.string().length(3).optional(),
  counterparty: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
  occurredAt: z.coerce.date()
});

export const transactionUpdateSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    direction: z.enum(["debit", "credit", "transfer"]).optional(),
    amount: z.coerce.number().positive().finite().optional(),
    currency: z.string().length(3).optional(),
    counterparty: z.string().trim().max(160).optional(),
    note: z.string().trim().max(1000).optional(),
    occurredAt: z.coerce.date().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(["debit", "credit", "transfer"]).optional(),
  categoryId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(["occurredAt", "amount"]).default("occurredAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().max(200).optional()
});

export const normalizeTransactionPayload = (input: {
  categoryId?: string | null;
  direction: TransactionDirection;
  amount: number;
  currency?: string;
  counterparty?: string;
  note?: string;
  occurredAt: Date;
}, defaultCurrency = "INR") => ({
  categoryId: input.categoryId ?? null,
  direction: input.direction,
  amount: input.amount.toFixed(2),
  currency: (input.currency ?? defaultCurrency).toUpperCase(),
  counterparty: input.counterparty,
  note: input.note,
  occurredAt: input.occurredAt
});
