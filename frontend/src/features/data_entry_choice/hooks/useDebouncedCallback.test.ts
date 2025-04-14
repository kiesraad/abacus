import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { renderHook } from "@/testing/test-utils";

import { useDebouncedCallback } from "./useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("Debounces callback with given delay", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));
    result.current();
    result.current();
    result.current();
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalled();
  });

  test("Calls callback with correct arguments", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));
    result.current(1);
    result.current(2);
    result.current(3);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledWith(3);
  });
});
