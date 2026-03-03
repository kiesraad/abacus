import { describe, expect, test } from "vitest";

import type { DisplayFraction } from "@/types/generated/openapi";

import { getFractionInteger, getFractionWithoutInteger } from "./fraction";

describe("Fraction util", () => {
  test.each([
    [{ integer: 0, numerator: 3, denominator: 4 } as DisplayFraction, ""],
    [{ integer: 0, numerator: 0, denominator: 4 } as DisplayFraction, "0"],
    [{ integer: 1, numerator: 3, denominator: 4 } as DisplayFraction, "1"],
  ])("Fraction getFractionInteger fraction %s as %s", (input: DisplayFraction, expected) => {
    expect(getFractionInteger(input)).toBe(expected);
  });

  test.each([
    [{ integer: 0, numerator: 3, denominator: 4 } as DisplayFraction, "3/4"],
    [{ integer: 0, numerator: 0, denominator: 4 } as DisplayFraction, ""],
    [{ integer: 1, numerator: 3, denominator: 4 } as DisplayFraction, "3/4"],
  ])("Fraction getFractionWithoutInteger fraction %s as %s", (input: DisplayFraction, expected) => {
    expect(getFractionWithoutInteger(input)).toBe(expected);
  });
});
