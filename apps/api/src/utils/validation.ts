import { ZodType } from "zod";
import { AppError } from "../errors.js";

export const parseOrThrow = <T>(schema: ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request payload", parsed.error.flatten());
  }
  return parsed.data;
};
