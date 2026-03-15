import { z } from "zod";

export const smsMessageInputSchema = z.object({
  messageId: z.string().trim().min(1).max(120).optional(),
  sender: z.string().trim().min(1).max(80).optional(),
  body: z.string().trim().min(1).max(1200),
  receivedAt: z.string().datetime().optional()
});

export const smsScanRequestSchema = z.object({
  messages: z.array(smsMessageInputSchema).min(1).max(200)
});
