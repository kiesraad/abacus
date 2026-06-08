import { describe, expect, test } from "vitest";
import { politicalGroupMockData, politicalGroupsMockData } from "../testing/api-mocks/ElectionMockData";
import type { PoliticalGroup } from "../types/generated/openapi";
import { getNumberOfCandidates } from "./politicalGroups";

describe("PoliticalGroups util", () => {
  test.each([
    [[politicalGroupMockData], 29],
    [politicalGroupsMockData, 31],
    [
      [
        {
          number: 100,
          name: "List without candidates",
          candidates: [],
        } satisfies PoliticalGroup,
      ],
      0,
    ],
  ])("Expect getNumberOfCandidates of %j to be %j", (input: PoliticalGroup[], expected: number) => {
    expect(getNumberOfCandidates(input)).toBe(expected);
  });
});
