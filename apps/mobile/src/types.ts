export type TransactionDirection = "debit" | "credit" | "transfer";

export type User = {
  id: string;
  email: string;
};

export type Category = {
  id: string;
  name: string;
  direction: TransactionDirection;
  isDefault: boolean;
};

export type Transaction = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  counterparty: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapPayload = {
  appName: string;
  currency: string;
  featureFlags: {
    smsImportEnabledByDefault: boolean;
    aiInsightsEnabled: boolean;
  };
  legal: {
    smsDisclosureVersion: string;
  };
};
