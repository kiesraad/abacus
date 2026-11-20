import { describe, expect, test } from "vitest";
import type { CommitteeDistrict, ElectionCategory, SubCommitteeFirstSession } from "@/types/generated/openapi";
import { getAreaDesignation, getDistrictLabel, getDistrictNumber, isLocalElection } from "./election";

describe("Election util", () => {
  test.each([
    ["Municipal", true],
    ["Provincial", false],
    ["WaterAuthority", false],
    ["HouseOfRepresentatives", false],
  ] satisfies Array<[ElectionCategory, boolean]>)("Election isLocalElection category %s as %s", (input, expected) => {
    expect(isLocalElection(input)).toBe(expected);
  });

  test.each([
    {
      number: 1,
      roman_numerals: true,
      expected: "I",
    },
    {
      number: 2,
      roman_numerals: true,
      expected: "II",
    },
    {
      number: 1,
      roman_numerals: false,
      expected: 1,
    },
    {
      number: 2,
      roman_numerals: false,
      expected: 2,
    },
    {
      number: undefined,
      roman_numerals: false,
      expected: "",
    },
  ] satisfies Array<{
    number: number | undefined;
    roman_numerals: boolean;
    expected: number | string;
  }>)(`Election getDistrictNumber for key.number: $number and roman_numerals $roman_numerals as $expected`, ({
    number,
    roman_numerals,
    expected,
  }) => {
    const input = {
      district: "Specific",
      name: "Juinen",
      key: {
        category: "ElectoralDistrict",
        number,
      },
      roman_numerals,
      frisian_export_allowed: false,
    } satisfies Extract<CommitteeDistrict, { district: "Specific" }>;
    expect(getDistrictNumber(input)).toBe(expected);
  });

  test.each([
    {
      number: 2,
      roman_numerals: true,
      withDistrictPrefix: true,
      expected: "Kieskring II - Juinen",
    },
    {
      number: 2,
      roman_numerals: true,
      withDistrictPrefix: false,
      expected: "II - Juinen",
    },
    {
      number: 2,
      roman_numerals: false,
      withDistrictPrefix: true,
      expected: "Kieskring 2 - Juinen",
    },
    {
      number: 2,
      roman_numerals: false,
      withDistrictPrefix: false,
      expected: "2 - Juinen",
    },
    {
      number: undefined,
      roman_numerals: false,
      withDistrictPrefix: true,
      expected: "Kieskring Juinen",
    },
    {
      number: undefined,
      roman_numerals: false,
      withDistrictPrefix: false,
      expected: "Juinen",
    },
  ] satisfies Array<{
    number: number | undefined;
    roman_numerals: boolean;
    withDistrictPrefix: boolean;
    expected: string;
  }>)(`Election getDistrictLabel for key.number: $number and roman_numerals $roman_numerals and withDistrictPrefix: $withDistrictPrefix as $expected`, ({
    number,
    roman_numerals,
    withDistrictPrefix,
    expected,
  }) => {
    const input = {
      district: "Specific",
      name: "Juinen",
      key: {
        category: "ElectoralDistrict",
        number,
      },
      roman_numerals,
      frisian_export_allowed: false,
    } satisfies Extract<CommitteeDistrict, { district: "Specific" }>;
    expect(getDistrictLabel(input, withDistrictPrefix)).toBe(expected);
  });

  test.each([
    [true, "GSB 0035 - Juinen"],
    [false, "0035 - Juinen"],
  ] satisfies Array<
    [boolean, string]
  >)("Election getAreaDesignation withCategoryPrefix %s as %s", (withCategoryPrefix, expected) => {
    const input = {
      committee_session_id: 801,
      id: 811,
      number: 35,
      name: "Juinen",
      category: "GSB",
      authority_id: "0035",
      authority_name: "Juinen",
      data_entry_id: 801,
    } satisfies SubCommitteeFirstSession;
    expect(getAreaDesignation(input, withCategoryPrefix)).toBe(expected);
  });
});
