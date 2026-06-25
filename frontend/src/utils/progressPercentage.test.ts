import { describe, expect, test } from "vitest";
import { calculateProgressPercentage } from "./progressPercentage";

describe("progressPercentage util", () => {
  test.each([
    [5, 0, 0, 1, 0], // total of 0 returns 0
    [0, 0, 0, 1, 0], // total of 0 returns 0
    [0, 5, 0, 1, 0], // 0 count returns 0
    [4, 1000, 0.5, 1, 0], // round down below ceiling threshold
    [5, 1000, 0.5, 1, 1], // round up within ceiling threshold
    [999, 1000, 0.5, 1, 99], // round down above ceiling threshold
    [0, 1000, 0, 1, 0], // 0 count returns 0
    [1, 1000, 0, 1, 1], // round up within ceiling threshold
    [999, 1000, 0, 1, 99], // round down above ceiling threshold
  ])("Percentage for %j/%j with threshold from %j to %j results in %j", (count: number, total: number, from: number, to: number, expected: number) => {
    expect(calculateProgressPercentage(count, total, from, to)).toBe(expected);
  });
});
