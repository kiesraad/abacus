import { describe, expect, it } from "vitest";
import { gsbListMockData } from "../testing/api-mocks/ElectionMockData";
import { electionStatusesCSBMock, electionStatusesMock } from "../testing/api-mocks/ElectionStatusMockData";
import type { ElectionStatusResponseEntry, RegionDetails } from "../types/generated/openapi";
import { sortList } from "./sorting";

describe("Sort list", () => {
  it("Sorts ElectionStatusResponseEntry polling station data entry source list correctly by number", () => {
    const unsortedList: ElectionStatusResponseEntry[] = [
      electionStatusesMock[0]!,
      electionStatusesMock[6]!,
      electionStatusesMock[1]!,
      electionStatusesMock[3]!,
      electionStatusesMock[4]!,
      electionStatusesMock[2]!,
      electionStatusesMock[5]!,
      electionStatusesMock[7]!,
    ];
    expect(unsortedList).not.toStrictEqual(electionStatusesMock);
    expect(sortList(unsortedList, (statuses) => statuses.source)).toStrictEqual(electionStatusesMock);
  });

  it("Sorts ElectionStatusResponseEntry subcommittee data entry source list correctly by name", () => {
    const expectedSortedList: ElectionStatusResponseEntry[] = [
      electionStatusesCSBMock[4]!,
      electionStatusesCSBMock[2]!,
      electionStatusesCSBMock[1]!,
      electionStatusesCSBMock[3]!,
      electionStatusesCSBMock[0]!,
    ];
    expect(electionStatusesCSBMock).not.toStrictEqual(expectedSortedList);
    expect(sortList(electionStatusesCSBMock, (statuses) => statuses.source)).toStrictEqual(expectedSortedList);
  });

  it("Sorts region details correctly by name", () => {
    const expectedSortedList: RegionDetails[] = [
      gsbListMockData[1]!,
      gsbListMockData[5]!,
      gsbListMockData[4]!,
      gsbListMockData[3]!,
      gsbListMockData[2]!,
      gsbListMockData[0]!,
    ];
    expect(gsbListMockData).not.toStrictEqual(expectedSortedList);
    expect(sortList(gsbListMockData, (gsb) => gsb)).toStrictEqual(expectedSortedList);
  });
});
