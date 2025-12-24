import { act, renderHook } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useQueryParam } from "./useQueryParam";

describe("useQueryParam", () => {
  const mockGet = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    const mockSetParams = vi.fn((callback) => {
      const params = { delete: mockDelete };
      (callback as (p: typeof params) => void)(params);
    });
    vi.spyOn(ReactRouter, "useSearchParams").mockImplementation(() => [
      { get: mockGet } as Partial<URLSearchParams> as URLSearchParams,
      mockSetParams,
    ]);
  });

  test("retrieve parameter", () => {
    mockGet.mockReturnValue("User created");

    const [message] = renderHook(() => useQueryParam("message")).result.current;
    expect(message).toBe("User created");
  });

  test("missing parameter", () => {
    mockGet.mockReturnValue(null);

    const [message] = renderHook(() => useQueryParam("message")).result.current;
    expect(message).toBeNull();
  });

  test("clear parameter", () => {
    mockGet.mockReturnValue("User created");

    const [message, clearMessage] = renderHook(() => useQueryParam("message")).result.current;
    expect(message).toBe("User created");

    act(() => {
      clearMessage();
    });

    expect(mockDelete).toHaveBeenCalledWith("message");
  });
});
