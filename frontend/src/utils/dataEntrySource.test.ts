import { describe, expect, test } from "vitest";
import type { DataEntrySource } from "@/types/generated/openapi";
import { getDataEntrySourceNumber } from "./dataEntrySource";

describe("getDataEntrySourceNumber", () => {
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

  const dataEntrySourceSubCommittee: DataEntrySource = {
    type: "SubCommittee",
    category: "GSB",
    id: 1,
    name: "Juinen",
    number: 1,
    committee_session_id: 1,
    data_entry_id: 1,
    authority_id: "0035",
    authority_name: "Juinen",
  };

  test.each([
    { number: 0, expected: "0" },
    { number: 8, expected: "8" },
    { number: 88, expected: "88" },
    { number: 888, expected: "888" },
    { number: 8888, expected: "8888" },
  ])("returns polling station number $number as $expected", ({ number, expected }) => {
    expect(getDataEntrySourceNumber({ ...dataEntrySourcePollingStation, number })).toBe(expected);
  });

  test("returns the authority id of a sub committee (not its number)", () => {
    expect(getDataEntrySourceNumber(dataEntrySourceSubCommittee)).toBe("0035");
  });
});
