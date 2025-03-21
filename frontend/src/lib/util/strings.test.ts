import { describe, expect, test } from "vitest";

import { ellipsis, parseIntStrict, parseIntUserInput, removeLeadingZeros } from "./strings";

describe("Strings util", () => {
  test.each([
    ["test", "test", 20],
    ["test", "...", 2],
    ["aaaaaaaxxx", "aaaa...", 7],
    ["", "", 20],
  ])("ellipsis %s as %s", (input: string, expected: string, maxLength: number) => {
    expect(ellipsis(input, maxLength)).equals(expected);
  });

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
  ])("parseIntUserInput %s", (input: string, expected: number | undefined = undefined) => {
    if (expected !== undefined) {
      expect(parseIntUserInput(input)).toBe(expected);
    } else {
      expect(parseIntUserInput(input)).toBeUndefined();
    }
  });
});
