import { describe, expect, test } from "vitest";

import { Fraction } from "@/api/gen/openapi";

import { getFractionInteger, getFractionWithoutInteger } from "./fraction";

describe("Fraction util", () => {
  test.each([
    [{ integer: 0, numerator: 3, denominator: 4 } as Fraction, ""],
    [{ integer: 0, numerator: 0, denominator: 4 } as Fraction, "0"],
    [{ integer: 1, numerator: 3, denominator: 4 } as Fraction, "1"],
  ])("Fraction getFractionInteger fraction %s as %s", (input: Fraction, expected) => {
    expect(getFractionInteger(input)).toBe(expected);
  });

  test.each([
    [{ integer: 0, numerator: 3, denominator: 4 } as Fraction, "3/4"],
    [{ integer: 0, numerator: 0, denominator: 4 } as Fraction, ""],
    [{ integer: 1, numerator: 3, denominator: 4 } as Fraction, "3/4"],
  ])("Fraction getFractionWithoutInteger fraction %s as %s", (input: Fraction, expected) => {
    expect(getFractionWithoutInteger(input)).toBe(expected);
  });
});
