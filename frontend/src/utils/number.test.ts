import { describe, expect, test } from "vitest";

import { deformatNumber, formatNumber, formatPercentage, validateNumberString } from "./number";

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

  test.each([
    [0, 100, "0,00%"],
    [1, 100, "1,00%"],
    [1, 1000, "0,10%"],
    [1, 9999, "0,01%"],
    [1, 10000, "0,01%"],
    [1, 100000, "0,00%"],
    [13, 10_000, "0,13%"],
  ])("Percentage format %j/%j as %j", (value: number, total: number, expected: string) => {
    expect(formatPercentage(value, total)).toBe(expected);
  });

  test.each<[number, number]>([
    [1, 0],
    [1, -100],
    [-1, 100],
    [NaN, 100],
    [Infinity, 100],
    [1, NaN],
    [1, Infinity],
  ])("Return empty string for %j/%j", (value, total) => {
    expect(formatPercentage(value, total)).toBe("");
  });
});
