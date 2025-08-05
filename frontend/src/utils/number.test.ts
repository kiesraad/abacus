import { describe, expect, test } from "vitest";

import { deformatNumber, formatNumber, validateNumberString } from "./number";

describe("Number util", () => {
  test.each([
    ["0", "0"],
    ["000", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
  ])("Number validate, format and deformat string %j as %j", (input: string, expected: string) => {
    expect(validateNumberString(input)).toBe(true);
    expect(formatNumber(input)).toBe(expected);
    expect(deformatNumber(expected)).toBe(parseInt(input, 10));
  });

  test.each([
    ["", ""],
    ["0", "0"],
    ["000", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
    [0, ""],
    [10, "10"],
    [10_000, "10.000"],
    [null, ""],
    [undefined, ""],
  ])("Number format %j as %j", (input: string | number | null | undefined, expected: string) => {
    expect(formatNumber(input)).toBe(expected);
  });

  test.each([
    ["", 0],
    ["0", 0],
    ["000", 0],
    ["8", 8],
    ["10", 10],
    ["1.000", 1_000],
    ["12.345", 12_345],
    ["123.456", 123_456],
    ["1000000", 1_000_000],
    ["1.000.000", 1_000_000],
    ["x", NaN],
  ])("Deformat number %j as %j", (input: string, expected: number) => {
    expect(deformatNumber(input)).toBe(expected);
  });
});
