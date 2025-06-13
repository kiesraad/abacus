import { describe, expect, test } from "vitest";

import { pollingStationResultsMockData } from "@/features/resolve_differences/testing/polling-station-results";
import { sectionHasDifferences } from "@/features/resolve_differences/utils/differences";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { getDataEntryStructureForDifferences } from "@/utils/dataEntryStructure";

describe("Resolve differences, differences util", () => {
  const first = pollingStationResultsMockData(true);
  const second = pollingStationResultsMockData(false);
  const structure = getDataEntryStructureForDifferences(electionMockData, first, second);

  test.each([
    { sectionId: "recounted", expected: true },
    { sectionId: "voters_votes_counts", expected: true },
    { sectionId: "differences_counts", expected: false },
    { sectionId: "political_group_votes_1", expected: true },
    { sectionId: "political_group_votes_2", expected: false },
  ])("sectionHasDifferences for $sectionId section", ({ sectionId, expected }) => {
    expect(sectionHasDifferences(structure.find((s) => s.id === sectionId)!, first, second)).toBe(expected);
  });
});
