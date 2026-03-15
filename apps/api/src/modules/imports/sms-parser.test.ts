import { describe, expect, it } from "vitest";
import { parseBankingSmsBatch, parseBankingSmsMessage } from "./sms-parser.js";

describe("sms-parser", () => {
  it("extracts debit transaction fields from a banking sms message", () => {
    const parsed = parseBankingSmsMessage({
      messageId: "msg-1",
      sender: "VK-HDFCBK",
      body: "Rs. 1,250.75 debited from A/c XX1234 to UPI AMAZON PAY on 13-03-2026. Ref UTR987654321.",
      receivedAt: "2026-03-13T10:15:00.000Z"
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(1250.75);
    expect(parsed?.direction).toBe("debit");
    expect(parsed?.counterparty).toContain("UPI AMAZON PAY");
    expect(parsed?.referenceId).toBe("UTR987654321");
    expect(parsed?.occurredAt).toBe("2026-03-13T10:15:00.000Z");
  });

  it("extracts credit transaction fields from a banking sms message", () => {
    const parsed = parseBankingSmsMessage({
      messageId: "msg-2",
      sender: "VM-SBIINB",
      body: "INR 2400.00 credited to your account from JOHN D via UPI. Txn ID 445566778899.",
      receivedAt: "2026-03-14T09:00:00.000Z"
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(2400);
    expect(parsed?.direction).toBe("credit");
    expect(parsed?.counterparty).toContain("JOHN D");
    expect(parsed?.referenceId).toBe("445566778899");
  });

  it("returns null when mandatory financial fields are missing", () => {
    const parsed = parseBankingSmsMessage({
      body: "Welcome to your bank. Your monthly statement is ready."
    });

    expect(parsed).toBeNull();
  });

  it("parses only valid transactions in a message batch", () => {
    const results = parseBankingSmsBatch([
      {
        messageId: "valid-1",
        body: "Rs 499 debited from account to NETFLIX. Ref TXN001."
      },
      {
        messageId: "noise-1",
        body: "Special offer: apply for a credit card today."
      }
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].messageId).toBe("valid-1");
    expect(results[0].direction).toBe("debit");
  });
});
