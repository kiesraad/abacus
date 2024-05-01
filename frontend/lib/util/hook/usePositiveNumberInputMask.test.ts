import { describe, expect, test } from "vitest";
import { usePositiveNumberInputMask } from "./usePositiveNumberInputMask";
import { renderHook } from "@testing-library/react";

describe("useInputMask", () => {
  test("should render", () => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format).toBeDefined();
  });

  test.each(["", null, undefined])(
    "%s renders as empty string",
    (input: string | null | undefined) => {
      const { result } = renderHook(() => usePositiveNumberInputMask());
      expect(result.current.format(input)).equals("");
    },
  );

  test.each([
    ["0", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
  ])("format string %s as %s", (input: string, expected: string) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format(input)).equals(expected);
  });

  test.each([
    [0, "0"],
    [8, "8"],
    [10, "10"],
    [1000, "1.000"],
    [12345, "12.345"],
    [123456, "123.456"],
    [1000000, "1.000.000"],
  ])("format number %i as %s", (input: number, expected: string) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format(input)).equals(expected);
  });

  //TODO: is this the desired behavior?
  test.each([
    [-10, "10"],
    [-1000000, "1.000.000"],
  ])("format negative number %i as %s", (input: number, expected: string) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format(input)).equals(expected);
  });

  //TODO: is this the desired behavior?
  test.each([
    ["A3asdb2", "32"],
    ["AAAA1234", "1.234"],
    ["-", "0"],
  ])("format unexpected input %s as %s", (input: string, expected: string) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format(input)).equals(expected);
  });

  test.each(["A", "AB", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"])("String %s becomes '0'", (input: string) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format(input)).equals("0");
  });
});
