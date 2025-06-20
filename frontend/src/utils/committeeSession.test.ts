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
  ])("Format committeeSessionLabel with number %s as %s", (input: number, expected: string) => {
    expect(committeeSessionLabel(input)).toBe(expected);
  });
});
