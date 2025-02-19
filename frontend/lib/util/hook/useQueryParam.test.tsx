import { useSearchParams } from "react-router";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { useQueryParam } from "./useQueryParam";

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSearchParams: vi.fn(),
}));

describe("useQueryParam", () => {
  const mockGet = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    const mockSetParams = vi.fn((callback) => {
      const params = { delete: mockDelete };
      (callback as (p: typeof params) => void)(params);
    });

    (useSearchParams as Mock).mockReturnValue([{ get: mockGet }, mockSetParams]);
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
