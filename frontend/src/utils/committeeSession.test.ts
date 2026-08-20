import { describe, expect, test } from "vitest";
import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import type { CommitteeSession } from "@/types/generated/openapi";
import { committee_session_details_present, committeeSessionLabel } from "./committeeSession";

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
    [1, "Zitting CSB"],
    [2, "Zitting CSB"],
    [3, "Zitting CSB"],
    [4, "Zitting CSB"],
    [5, "Zitting CSB"],
    [6, "Zitting CSB"],
  ])("CSB: Format committeeSessionLabel with number %s as %s", (input: number, expected: string) => {
    expect(committeeSessionLabel("CSB", input)).toBe(expected);
  });
});

test.each([
  [getCommitteeSessionMockData({ location: "", start_date_time: undefined }), false],
  [getCommitteeSessionMockData({ location: "Juinen", start_date_time: undefined }), false],
  [getCommitteeSessionMockData({ location: "", start_date_time: "" }), false],
  [getCommitteeSessionMockData({ location: "Juinen", start_date_time: "" }), false],
  [getCommitteeSessionMockData({ location: "", start_date_time: "2026-03-18T21:36:00" }), false],
  [getCommitteeSessionMockData({ location: "Juinen", start_date_time: "2026-03-18T21:36:00" }), true],
])("committee_session_details_present with committeeSession %s to be %s", (input: CommitteeSession, expected: boolean) => {
  expect(committee_session_details_present(input)).toBe(expected);
});
