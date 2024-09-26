import { describe, expect, test } from "vitest";

import { deformatNumber, formatNumber, validateNumberString } from "./format";

describe("Format util", () => {
  test.each([
    ["0", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
  ])("Number format string %s as %s", (input: string, expected: string) => {
    expect(validateNumberString(input)).equals(true);
    expect(formatNumber(input)).equals(expected);
    expect(deformatNumber(expected)).equals(parseInt(input, 10));
  });
});
