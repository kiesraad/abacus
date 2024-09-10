import { describe, expect, test } from "vitest";

import { renderHook } from "app/test/unit";

import { usePositiveNumberInputMask } from "@kiesraad/util";

describe("useInputMask", () => {
  test("should render", () => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format).toBeDefined();
  });

  test.each(["", null, undefined])("%s renders as empty string", (input: string | null | undefined) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.format(input)).equals("");
  });

  // Allowed String cases:
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
    expect(result.current.validate(input)).equals(true);
    expect(result.current.format(input)).equals(expected);
  });

  // Allowed number cases:
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
    expect(result.current.validate(input)).equals(true);
    expect(result.current.format(input)).equals(expected);
  });

  // Allowed cases with whitespace or dots
  test.each([
    [" 25", "25"],
    ["50 ", "50"],
    [" 75 ", "75"],
    ["100.", "100"],
    ["100.000", "100.000"],
    ["1.000.000", "1.000.000"],
  ])("format string %s as %s", (input: string, expected: string) => {
    const { result } = renderHook(() => usePositiveNumberInputMask());
    expect(result.current.validate(input)).equals(true);
    expect(result.current.format(input)).equals(expected);
  });

  // Disallowed cases
  test.each(["a25", "-50", "75-", "100.00", "10000.000", "afasd382asd", "100 10", "100,000", "100 000", "11,00"])(
    "unexpected string becomes empty",
    (input: string) => {
      const { result } = renderHook(() => usePositiveNumberInputMask());
      expect(result.current.validate(input)).equals(false);
    },
  );

  test("reverse format", () => {
    const { result } = renderHook(() => usePositiveNumberInputMask());

    const testNumber = 12345;
    let formatted = result.current.format(testNumber);
    let deformatted = result.current.deformat(formatted);
    expect(deformatted).equals(testNumber);

    // Make sure empty value is converted to 0 instead of null
    const testString = "";
    formatted = result.current.format(testString);
    deformatted = result.current.deformat(formatted);
    expect(deformatted).equals(0);
  });
});
