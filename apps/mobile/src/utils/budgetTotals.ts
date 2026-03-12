import { Budget } from "../types";

export const calculateBudgetTotals = (items: Budget[]): { budgeted: number; spent: number; remaining: number } => {
  const totals = items.reduce(
    (accumulator, item) => {
      accumulator.budgeted += item.amount;
      accumulator.spent += item.spentAmount;
      accumulator.remaining += item.remainingAmount;
      return accumulator;
    },
    { budgeted: 0, spent: 0, remaining: 0 }
  );

  return {
    budgeted: Number(totals.budgeted.toFixed(2)),
    spent: Number(totals.spent.toFixed(2)),
    remaining: Number(totals.remaining.toFixed(2))
  };
};
