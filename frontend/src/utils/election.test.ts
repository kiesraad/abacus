import { describe, expect, test } from "vitest";
import type { CommitteeDistrict, ElectionCategory, RegionCategory } from "@/types/generated/openapi";
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
      category: "ElectoralDistrict",
      number: 1,
      roman_numerals: true,
      expected: "I",
    },
    {
      category: "ElectoralDistrict",
      number: 2,
      roman_numerals: true,
      expected: "II",
    },
    {
      category: "ElectoralDistrict",
      number: 1,
      roman_numerals: false,
      expected: 1,
    },
    {
      category: "ElectoralDistrict",
      number: 2,
      roman_numerals: false,
      expected: 2,
    },
    {
      category: "State",
      number: undefined,
      roman_numerals: false,
      expected: "",
    },
  ] satisfies Array<{
    category: RegionCategory;
    number: number | undefined;
    roman_numerals: boolean;
    expected: number | string;
  }>)(`Fraction getDistrictNumber for key {category: $category, number: $number} and roman_numerals $roman_numerals as $expected`, ({
    category,
    number,
    roman_numerals,
    expected,
  }) => {
    const input = {
      district: "Specific",
      name: "Juinen",
      key: {
        category,
        number,
      },
      roman_numerals,
      frisian_export_allowed: false,
    } satisfies Extract<CommitteeDistrict, { district: "Specific" }>;
    expect(getDistrictNumber(input)).toBe(expected);
  });
});
