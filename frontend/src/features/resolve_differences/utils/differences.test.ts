import { describe, expect, test } from "vitest";

import { pollingStationResultsMockData } from "@/features/resolve_differences/testing/polling-station-results";
import { sections } from "@/features/resolve_differences/utils/dataEntry";
import { groupHasDifferences, sectionHasDifferences } from "@/features/resolve_differences/utils/differences";
import { politicalGroupsMockData } from "@/testing/api-mocks/ElectionMockData";

describe("Resolve differences, differences util", () => {
  const first = pollingStationResultsMockData(true);
  const second = pollingStationResultsMockData(false);

  describe("sectionHasDifferences", () => {
    test("should return true for differences", () => {
      expect(sectionHasDifferences(sections[1]!, first, second)).toBe(true);
    });

    test("should return false for no differences", () => {
      expect(sectionHasDifferences(sections[2]!, first, second)).toBe(false);
    });
  });

  describe("groupHasDifferences", () => {
    test("should return true for differences", () => {
      expect(
        groupHasDifferences(
          politicalGroupsMockData[0]!,
          first.political_group_votes[0],
          second.political_group_votes[0],
        ),
      ).toBe(true);
    });

    test("should return false for no differences", () => {
      expect(
        groupHasDifferences(
          politicalGroupsMockData[1]!,
          first.political_group_votes[1],
          second.political_group_votes[1],
        ),
      ).toBe(false);
    });
  });
});
