import { z } from "zod";

export const categoryDirectionSchema = z.enum(["debit", "credit", "transfer"]);

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  direction: categoryDirectionSchema
});

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    direction: categoryDirectionSchema.optional()
  })
  .refine((value) => value.name !== undefined || value.direction !== undefined, {
    message: "At least one field must be provided."
  });

export const categoryIdParamSchema = z.object({
  id: z.string().uuid()
});

