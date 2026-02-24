import { describe, expect, test } from "vitest";

import { committeeSessionLabel } from "./committeeSession";

describe("CommitteeSessionLabel util", () => {
  test.each([
    [1, "Eerste zitting"],
    [2, "Tweede zitting"],
    [3, "Derde zitting"],
    [4, "Vierde zitting"],
    [5, "Vijfde zitting"],
    [6, "Zitting 6"],
  ])("GSB: Format committeeSessionLabel with number %s as %s", (input: number, expected: string) => {
    expect(committeeSessionLabel("GSB", input)).toBe(expected);
  });

  // CSB doesn't use multiple committee sessions. Possibly update this test in the future.
  test.each([
    [1, "Zitting"],
    [2, "Zitting"],
    [3, "Zitting"],
    [4, "Zitting"],
    [5, "Zitting"],
    [6, "Zitting"],
  ])("CSB: Format committeeSessionLabel with number %s as %s", (input: number, expected: string) => {
    expect(committeeSessionLabel("CSB", input)).toBe(expected);
  });
});
