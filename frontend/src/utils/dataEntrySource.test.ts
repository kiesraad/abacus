import { describe, expect, test } from "vitest";
import { dataEntryValidGetMockResponse, subCommitteeSource } from "@/testing/api-mocks/DataEntryMockData";
import { getDataEntrySourceLabel, getDataEntrySourceNumber } from "./dataEntrySource";

const pollingStationSource = dataEntryValidGetMockResponse.source;

describe("getDataEntrySourceNumber", () => {
  test.each([
    { number: 0, expected: "0" },
    { number: 8, expected: "8" },
    { number: 88, expected: "88" },
    { number: 888, expected: "888" },
    { number: 8888, expected: "8888" },
  ])("returns polling station number $number as $expected", ({ number, expected }) => {
    expect(getDataEntrySourceNumber({ ...pollingStationSource, number })).toBe(expected);
  });

  test("returns the authority id of a sub committee (not its number)", () => {
    expect(getDataEntrySourceNumber(subCommitteeSource)).toBe("0035");
  });
});

describe("getDataEntrySourceLabel", () => {
  test.each([
    { number: 0, expected: "0" },
    { number: 8, expected: "8" },
    { number: 88, expected: "88" },
    { number: 888, expected: "888" },
    { number: 8888, expected: "8888" },
  ])("returns polling station number $number as $expected", ({ number, expected }) => {
    expect(getDataEntrySourceLabel({ ...pollingStationSource, number })).toBe(expected);
  });

  test("returns the name of a sub committee (not its number)", () => {
    expect(getDataEntrySourceLabel(subCommitteeSource)).toBe("Juinen");
  });
});
