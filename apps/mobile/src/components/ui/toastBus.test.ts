import { describe, expect, it, vi } from "vitest";
import { publishToast, subscribeToToasts } from "./toastBus";

describe("toastBus", () => {
  it("publishes to subscribers with defaults", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    publishToast({
      message: "Saved."
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const toast = listener.mock.calls[0]?.[0];
    expect(toast?.id).toBeTypeOf("number");
    expect(toast?.tone).toBe("info");
    expect(toast?.durationMs).toBe(3000);
    expect(toast?.message).toBe("Saved.");

    unsubscribe();
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    unsubscribe();

    publishToast({
      message: "Should not emit"
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
