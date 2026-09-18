import { describe, expect, test } from "vitest";
import type { DataEntrySource } from "@/types/generated/openapi";
import { formatDataEntrySourceNumber } from "./dataEntrySource";

describe("formatDataEntrySourceNumber", () => {
  const dataEntrySourcePollingStation: DataEntrySource = {
    type: "PollingStation",
    address: "Test",
    id: 1,
    locality: "Test",
    name: "Stembureau Test",
    number: 1,
    postal_code: "Test",
    session_type: "First",
    committee_session_id: 1,
    data_entry_id: 1,
  };

  const dataEntrySourceSubCommitteeGsb: DataEntrySource = {
    type: "SubCommittee",
    category: "GSB",
    id: 1,
    name: "Gemeente Test",
    number: 1,
    committee_session_id: 1,
    data_entry_id: 1,
  };

  const dataEntrySourceSubCommitteeNotGsb: DataEntrySource = {
    type: "SubCommittee",
    category: "CSB",
    id: 1,
    name: "Test",
    number: 1,
    committee_session_id: 1,
    data_entry_id: 1,
  };

  test.each([
    { source: dataEntrySourcePollingStation, number: 0, expected: "0" },
    { source: dataEntrySourcePollingStation, number: 8, expected: "8" },
    { source: dataEntrySourcePollingStation, number: 88, expected: "88" },
    { source: dataEntrySourcePollingStation, number: 888, expected: "888" },
    { source: dataEntrySourcePollingStation, number: 8888, expected: "8888" },
    { source: dataEntrySourceSubCommitteeGsb, number: 0, expected: "0000" },
    { source: dataEntrySourceSubCommitteeGsb, number: 8, expected: "0008" },
    { source: dataEntrySourceSubCommitteeGsb, number: 88, expected: "0088" },
    { source: dataEntrySourceSubCommitteeGsb, number: 888, expected: "0888" },
    { source: dataEntrySourceSubCommitteeGsb, number: 8888, expected: "8888" },
  ])(`Format $source.type $number as $expected`, ({ source, number, expected }) => {
    expect(formatDataEntrySourceNumber({ ...source, number })).toBe(expected);
  });

  test("Does not pad a sub committee that is not a GSB", () => {
    expect(formatDataEntrySourceNumber({ ...dataEntrySourceSubCommitteeNotGsb, number: 8 })).toBe("8");
  });
});
