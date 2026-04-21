import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import { AppError } from "../errors.js";
import { shouldReportErrorToSentry } from "./sentry.js";

describe("shouldReportErrorToSentry", () => {
  it("does not report handled 4xx AppError values", () => {
    expect(shouldReportErrorToSentry(new AppError(400, "VALIDATION_ERROR", "Bad input"))).toBe(false);
  });

  it("reports 5xx AppError values", () => {
    expect(shouldReportErrorToSentry(new AppError(503, "FX_UNAVAILABLE", "Try later"))).toBe(true);
  });

  it("does not report Zod validation errors", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(shouldReportErrorToSentry(result.error)).toBe(false);
    expect(result.error).toBeInstanceOf(ZodError);
  });

  it("does not report mapped Fastify 4xx parser errors", () => {
    expect(
      shouldReportErrorToSentry({ code: "FST_ERR_CTP_EMPTY_JSON_BODY", message: "Body cannot be empty" })
    ).toBe(false);
  });

  it("reports unknown exceptions", () => {
    expect(shouldReportErrorToSentry(new Error("Unhandled crash"))).toBe(true);
  });
});
