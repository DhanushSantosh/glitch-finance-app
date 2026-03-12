import { describe, expect, it } from "vitest";
import { defaultTabRoute, emptyModalRoute, tabRouteOrder, tabSpecs } from "./routes";

describe("navigation route map", () => {
  it("defines five bottom tabs in expected order", () => {
    expect(tabRouteOrder).toEqual(["dashboard", "transactions", "budgets", "goals", "settings"]);
    expect(tabSpecs).toHaveLength(5);
  });

  it("keeps tab route specs unique and aligned", () => {
    const routes = tabSpecs.map((spec) => spec.route);
    const uniqueRoutes = new Set(routes);

    expect(uniqueRoutes.size).toBe(routes.length);
    expect(routes).toEqual(tabRouteOrder);
  });

  it("starts with dashboard tab and no modal route", () => {
    expect(defaultTabRoute).toBe("dashboard");
    expect(emptyModalRoute).toEqual({ kind: "none" });
  });
});
