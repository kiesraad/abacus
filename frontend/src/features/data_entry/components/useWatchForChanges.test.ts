import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { renderHook, waitFor } from "@/testing";

import { useWatchForChanges } from "./useWatchForChanges";

describe("useWatchForChanges", () => {
  test("it doesnt do anything when active is false", async () => {
    const oldValues = { foo: "bar" };
    const getNewValues = () => ({ foo: "baz" });

    const { result } = renderHook(() => useWatchForChanges(false, oldValues, getNewValues));

    const user = userEvent.setup();
    await user.keyboard("a");

    await waitFor(() => {
      expect(result.current.hasChanges).toBe(false);
    });
  });

  test("it shows changes", async () => {
    const oldValues = { foo: "bar" };
    const getNewValues = () => ({ foo: "baz" });

    const { result } = renderHook(() => useWatchForChanges(true, oldValues, getNewValues));
    const user = userEvent.setup();
    await user.keyboard("a");

    await waitFor(() => {
      expect(result.current.hasChanges).toBe(true);
    });
  });

  test("it shows no changes", async () => {
    const oldValues = { foo: "bar" };
    const getNewValues = () => ({ foo: "bar" });

    const { result } = renderHook(() => useWatchForChanges(true, oldValues, getNewValues));
    const user = userEvent.setup();
    await user.keyboard("a");

    await waitFor(() => {
      expect(result.current.hasChanges).toBe(false);
    });
  });

  test("hasChanged reset with changing oldValues", async () => {
    const oldValues = { foo: "bar" };
    const getNewValues = () => ({ foo: "baz" });
    const nextOldValues = { foo: "baz" };

    const { result, rerender } = renderHook(({ par1, par2, par3 }) => useWatchForChanges(par1, par2, par3), {
      initialProps: { par1: true, par2: oldValues, par3: getNewValues },
    });

    const user = userEvent.setup();
    await user.keyboard("a");

    await waitFor(() => {
      expect(result.current.hasChanges).toBe(true);
    });

    rerender({ par1: true, par2: nextOldValues, par3: getNewValues });

    expect(result.current.hasChanges).toBe(false);
  });
});
