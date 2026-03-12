import { Platform } from "react-native";
import { BootstrapPayload, Budget, BudgetListResponse, Category, Goal, ReportSummary, Transaction, User } from "../types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

const rewriteLoopbackForAndroid = (rawUrl: string): string => {
  if (Platform.OS !== "android") {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = "10.0.2.2";
      return parsed.toString().replace(/\/$/, "");
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
};

const resolveApiBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) {
    return rewriteLoopbackForAndroid(fromEnv);
  }
  return rewriteLoopbackForAndroid("http://localhost:4000");
};

const API_BASE_URL = resolveApiBaseUrl();

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = (await response.json()) as T & ApiErrorPayload;

  if (!response.ok) {
    const message = json.error?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
};

export const apiClient = {
  baseUrl: API_BASE_URL,

  async getBootstrap(): Promise<BootstrapPayload> {
    return request<BootstrapPayload>("/api/v1/bootstrap");
  },

  async requestOtp(email: string): Promise<{ message: string; debugOtpCode?: string }> {
    return request<{ message: string; debugOtpCode?: string }>("/api/v1/auth/request-otp", {
      method: "POST",
      body: { email }
    });
  },

  async verifyOtp(email: string, code: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: { email, code }
    });

    return result;
  },

  async me(token: string): Promise<User> {
    return request<User>("/api/v1/me", {
      token
    });
  },

  async logout(token: string): Promise<void> {
    await request<{ success: boolean }>("/api/v1/auth/logout", {
      method: "POST",
      token
    });
  },

  async getCategories(token: string): Promise<Category[]> {
    const result = await request<{ items: Category[] }>("/api/v1/categories", {
      token
    });
    return result.items;
  },

  async getTransactions(token: string): Promise<Transaction[]> {
    const result = await request<{ items: Transaction[] }>("/api/v1/transactions?page=1&pageSize=100", {
      token
    });
    return result.items;
  },

  async createTransaction(
    token: string,
    payload: {
      direction: "debit" | "credit" | "transfer";
      amount: number;
      categoryId?: string | null;
      counterparty?: string;
      note?: string;
      currency?: string;
      occurredAt: string;
    }
  ): Promise<Transaction> {
    const result = await request<{ item: Transaction }>("/api/v1/transactions", {
      method: "POST",
      token,
      body: payload
    });
    return result.item;
  },

  async updateTransaction(
    token: string,
    transactionId: string,
    payload: {
      direction: "debit" | "credit" | "transfer";
      amount: number;
      categoryId?: string | null;
      counterparty?: string;
      note?: string;
      currency?: string;
      occurredAt: string;
    }
  ): Promise<Transaction> {
    const result = await request<{ item: Transaction }>(`/api/v1/transactions/${transactionId}`, {
      method: "PATCH",
      token,
      body: payload
    });
    return result.item;
  },

  async deleteTransaction(token: string, transactionId: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/transactions/${transactionId}`, {
      method: "DELETE",
      token
    });
  },

  async logSmsIntent(token: string, enabled: boolean): Promise<void> {
    await request<{ acknowledged: boolean }>("/api/v1/consents/sms-import-intent", {
      method: "POST",
      token,
      body: { enabled }
    });
  },

  async getBudgets(token: string, month?: string): Promise<BudgetListResponse> {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    return request<BudgetListResponse>(`/api/v1/budgets${query}`, {
      token
    });
  },

  async createBudget(token: string, payload: { categoryId: string; month: string; amount: number; currency: string }): Promise<void> {
    await request<{ item: unknown }>("/api/v1/budgets", {
      method: "POST",
      token,
      body: payload
    });
  },

  async updateBudget(
    token: string,
    budgetId: string,
    payload: Partial<{ categoryId: string; month: string; amount: number; currency: string }>
  ): Promise<void> {
    await request<{ item: unknown }>(`/api/v1/budgets/${budgetId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },

  async deleteBudget(token: string, budgetId: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/budgets/${budgetId}`, {
      method: "DELETE",
      token
    });
  },

  async getGoals(token: string): Promise<Goal[]> {
    const result = await request<{ items: Goal[] }>("/api/v1/goals", {
      token
    });
    return result.items;
  },

  async createGoal(
    token: string,
    payload: { name: string; targetAmount: number; currentAmount: number; currency: string; targetDate?: string }
  ): Promise<void> {
    await request<{ item: Goal }>("/api/v1/goals", {
      method: "POST",
      token,
      body: payload
    });
  },

  async updateGoal(
    token: string,
    goalId: string,
    payload: Partial<{ name: string; targetAmount: number; currentAmount: number; currency: string; targetDate: string | null }>
  ): Promise<void> {
    await request<{ item: Goal }>(`/api/v1/goals/${goalId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },

  async deleteGoal(token: string, goalId: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/goals/${goalId}`, {
      method: "DELETE",
      token
    });
  },

  async getReportSummary(token: string, month?: string): Promise<ReportSummary> {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    return request<ReportSummary>(`/api/v1/reports/summary${query}`, {
      token
    });
  }
};
