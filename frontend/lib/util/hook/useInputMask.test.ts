import { describe, expect, test } from "vitest";
import { useInputMask } from "./useInputMask";
import { renderHook } from "@testing-library/react";

describe("useInputMask", () => {
  test("should render", () => {
    const { result } = renderHook(() => useInputMask({}));
    expect(result.current.format).toBeDefined();
  });

  test("formats numbers", () => {
    const { result } = renderHook(() => useInputMask({}));
    expect(result.current.format(1000)).equals("1.000");
  });
});
