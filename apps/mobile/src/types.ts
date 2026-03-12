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

export type TransactionListQuery = {
  page?: number;
  pageSize?: number;
  direction?: TransactionDirection;
  categoryId?: string;
  from?: string;
  to?: string;
  sortBy?: "occurredAt" | "amount";
  sortOrder?: "asc" | "desc";
};

export type TransactionListResponse = {
  items: Transaction[];
  pagination: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    nextPage: number | null;
  };
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

export type Budget = {
  id: string;
  categoryId: string;
  categoryName: string;
  month: string;
  amount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetListResponse = {
  month: string;
  items: Budget[];
  totals: {
    budgeted: number;
    spent: number;
    remaining: number;
  };
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  currency: string;
  targetDate: string | null;
  closedAt: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReportSummary = {
  month: string;
  period: {
    start: string;
    endExclusive: string;
  };
  totals: {
    income: number;
    expense: number;
    transfer: number;
    net: number;
    transactionCount: number;
    currency: string;
  };
  topCategories: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: number;
    transactionCount: number;
    currency: string;
  }>;
  dailySeries: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
    currency: string;
  }>;
};
