import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSingleCall } from "./useSingleCall";

describe("useSingleCall", () => {
  it("should call the function only once", () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useSingleCall(mockFn));

    const call = result.current[0];

    act(() => {
      call();
      call();
      call();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should return the result of the function", () => {
    const mockFn = vi.fn((bar) => `foo${bar}`);
    const { result } = renderHook(() => useSingleCall(mockFn));

    const call = result.current[0];
    let returnValue: string | undefined;
    act(() => {
      returnValue = call("bar");
    });

    expect(returnValue).toBe("foobar");
  });
});
