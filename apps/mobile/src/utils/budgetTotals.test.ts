import { describe, expect, it } from "vitest";
import { Budget } from "../types";
import { calculateBudgetTotals } from "./budgetTotals";

const createBudget = (overrides: Partial<Budget>): Budget => ({
  id: overrides.id ?? "budget-id",
  categoryId: overrides.categoryId ?? "category-id",
  categoryName: overrides.categoryName ?? "Food",
  month: overrides.month ?? "2026-03",
  amount: overrides.amount ?? 0,
  spentAmount: overrides.spentAmount ?? 0,
  remainingAmount: overrides.remainingAmount ?? 0,
  utilizationPercent: overrides.utilizationPercent ?? 0,
  currency: overrides.currency ?? "INR",
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString()
});

describe("budget totals", () => {
  it("sums budget totals and rounds to 2 decimals", () => {
    const totals = calculateBudgetTotals([
      createBudget({ amount: 1000.12, spentAmount: 750.11, remainingAmount: 250.01 }),
      createBudget({ id: "budget-2", amount: 2000.2, spentAmount: 200.2, remainingAmount: 1800 })
    ]);

    expect(totals).toEqual({
      budgeted: 3000.32,
      spent: 950.31,
      remaining: 2050.01
    });
  });

  it("returns zero totals for empty budgets", () => {
    expect(calculateBudgetTotals([])).toEqual({
      budgeted: 0,
      spent: 0,
      remaining: 0
    });
  });
});
