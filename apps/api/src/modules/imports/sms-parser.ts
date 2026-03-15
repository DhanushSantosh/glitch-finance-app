import { z } from "zod";
import { smsMessageInputSchema } from "./validation.js";

type SmsMessageInput = z.infer<typeof smsMessageInputSchema>;

type ParsedDirection = "debit" | "credit";

export type ParsedSmsTransaction = {
  messageId: string | null;
  amount: number;
  currency: "INR";
  direction: ParsedDirection;
  counterparty: string | null;
  occurredAt: string | null;
  referenceId: string | null;
  confidence: number;
};

const parseAmount = (rawAmount: string): number | null => {
  const normalized = rawAmount.replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
};

const extractAmount = (text: string): number | null => {
  const amountPatterns = [
    /(?:INR|Rs\.?|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
    /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:INR|Rs\.?|₹)/i
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (!match || !match[1]) {
      continue;
    }

    const parsed = parseAmount(match[1]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const findFirstKeywordIndex = (text: string, keywords: string[]): number => {
  let firstIndex = Number.POSITIVE_INFINITY;
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index >= 0 && index < firstIndex) {
      firstIndex = index;
    }
  }
  return firstIndex;
};

const extractDirection = (lowerText: string): ParsedDirection | null => {
  const debitKeywords = [" debited", " spent", " paid", " sent", " debit "];
  const creditKeywords = [" credited", " received", " deposited", " credit "];

  const debitIndex = findFirstKeywordIndex(lowerText, debitKeywords);
  const creditIndex = findFirstKeywordIndex(lowerText, creditKeywords);

  if (!Number.isFinite(debitIndex) && !Number.isFinite(creditIndex)) {
    return null;
  }

  if (debitIndex <= creditIndex) {
    return "debit";
  }

  return "credit";
};

const cleanCounterparty = (value: string): string | null => {
  const normalized = value.trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
  if (normalized.length < 2) {
    return null;
  }
  return normalized.slice(0, 80);
};

const extractCounterparty = (text: string, direction: ParsedDirection): string | null => {
  const patterns =
    direction === "debit"
      ? [/\bto\s+([A-Za-z0-9 .&-]{2,80})/i, /\bat\s+([A-Za-z0-9 .&-]{2,80})/i]
      : [/\bfrom\s+([A-Za-z0-9 .&-]{2,80})/i];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || !match[1]) {
      continue;
    }

    const cleaned = cleanCounterparty(match[1]);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
};

const extractReferenceId = (text: string): string | null => {
  const patterns = [
    /\b(?:UTR|Ref(?:erence)?(?:\s*No)?|Txn(?:\s*ID)?|Transaction(?:\s*ID)?)[:\s-]*([A-Za-z0-9-]{6,40})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || !match[1]) {
      continue;
    }

    return match[1].trim();
  }

  return null;
};

const resolveOccurredAt = (receivedAt?: string): string | null => {
  if (!receivedAt) {
    return null;
  }

  const parsed = new Date(receivedAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const calculateConfidence = (input: {
  amount: number | null;
  direction: ParsedDirection | null;
  counterparty: string | null;
  occurredAt: string | null;
  referenceId: string | null;
}): number => {
  let score = 0;

  if (input.amount !== null) score += 0.4;
  if (input.direction !== null) score += 0.3;
  if (input.counterparty !== null) score += 0.1;
  if (input.occurredAt !== null) score += 0.1;
  if (input.referenceId !== null) score += 0.1;

  return Number(score.toFixed(2));
};

export const parseBankingSmsMessage = (message: SmsMessageInput): ParsedSmsTransaction | null => {
  const text = message.body;
  const lowerText = text.toLowerCase();

  const amount = extractAmount(text);
  const direction = extractDirection(` ${lowerText} `);
  const occurredAt = resolveOccurredAt(message.receivedAt);
  const referenceId = extractReferenceId(text);
  const counterparty = direction ? extractCounterparty(text, direction) : null;

  if (amount === null || direction === null) {
    return null;
  }

  return {
    messageId: message.messageId ?? null,
    amount,
    currency: "INR",
    direction,
    counterparty,
    occurredAt,
    referenceId,
    confidence: calculateConfidence({
      amount,
      direction,
      counterparty,
      occurredAt,
      referenceId
    })
  };
};

export const parseBankingSmsBatch = (messages: SmsMessageInput[]): ParsedSmsTransaction[] => {
  const parsed: ParsedSmsTransaction[] = [];
  for (const message of messages) {
    const result = parseBankingSmsMessage(message);
    if (result) {
      parsed.push(result);
    }
  }
  return parsed;
};
