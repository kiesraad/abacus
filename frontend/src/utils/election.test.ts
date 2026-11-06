import { describe, expect, test } from "vitest";
import type { CommitteeDistrict, ElectionCategory } from "@/types/generated/openapi";
import { getDistrictNumber, isLocalElection } from "./election";

describe("Election util", () => {
  test.each([
    ["Municipal", true],
    ["Provincial", false],
    ["WaterAuthority", false],
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
});
