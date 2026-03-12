import { describe, expect, it } from "vitest";
import { lightTheme } from "../theme/tokens";
import { getStatusColor } from "./statusTone";

describe("status color mapping", () => {
  it("maps each tone to semantic theme color", () => {
    expect(getStatusColor("success")).toBe(lightTheme.color.statusSuccess);
    expect(getStatusColor("warn")).toBe(lightTheme.color.statusWarn);
    expect(getStatusColor("error")).toBe(lightTheme.color.statusError);
    expect(getStatusColor("info")).toBe(lightTheme.color.statusInfo);
  });
});
