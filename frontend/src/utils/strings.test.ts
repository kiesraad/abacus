import { describe, expect, test } from "vitest";

import { formatList, parseIntStrict, parseIntUserInput, removeLeadingZeros } from "./strings";

describe("Strings util", () => {
  test.each([
    ["0", 0],
    ["00"],
    ["01000"],
    ["123", 123],
    ["0123"],
    ["00123"],
    ["00123"],
    ["123a"],
    ["a123"],
    ["123 456"],
    [" 123456 "],
    ["/123/456"],
    ["'123456'"],
    ["six"],
    [""],
  ])("parseIntStrict %s", (input: string, expected: number | undefined = undefined) => {
    if (expected !== undefined) {
      expect(parseIntStrict(input)).toBe(expected);
    } else {
      expect(parseIntStrict(input)).toBeUndefined();
    }
  });

  test.each([
    ["0", "0"],
    ["00", "0"],
    ["01000", "1000"],
    ["123", "123"],
    ["0123", "123"],
    ["00123", "123"],
    ["123a", "123a"],
    ["a123", "a123"],
    ["123 456", "123 456"],
    [" 123456 ", " 123456 "],
    ["/123/456", "/123/456"],
    ["'123456'", "'123456'"],
    ["six", "six"],
  ])("removeLeadingZeros %s", (input: string, expected: string) => {
    expect(removeLeadingZeros(input)).toBe(expected);
  });

  test.each([
    ["0", 0],
    ["00", 0],
    ["01000", 1000],
    ["123", 123],
    ["0123", 123],
    ["00123", 123],
    ["123a"],
    ["a123"],
    ["123 456"],
    [" 123456 "],
    ["/123/456"],
    ["'123456'"],
    ["six"],
    [""],
  ])("parseIntUserInput %s", (input: string, expected: number | undefined = undefined) => {
    if (expected !== undefined) {
      expect(parseIntUserInput(input)).toBe(expected);
    } else {
      expect(parseIntUserInput(input)).toBeUndefined();
    }
  });

  test.each([
    [[], "and", ""],
    [["A"], "and", "A"],
    [["A", "B"], "and", "A and B"],
    [["A", "B", "C"], "and", "A, B and C"],
    [["A", "B", "C"], "or", "A, B or C"],
    [["A ", " B", " C"], "or", "A ,  B or  C"],
  ])("formatList(%j, %s)", (items, conjunction, expected) => {
    expect(formatList(items, conjunction)).toBe(expected);
  });
});
