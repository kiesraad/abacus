import { describe, expect, test } from "vitest";
import type { CommitteeDistrict, ElectionCategory } from "@/types/generated/openapi";
import {
  formatAreaDesignation,
  formatElectionTypeLabel,
  getDistrictLabel,
  getDistrictNumber,
  isLocalElection,
} from "./election";

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

  test("Election formatAreaDesignation", () => {
    expect(formatAreaDesignation("0035", "Juinen", "GSB")).toBe("GSB 0035 - Juinen");
    expect(formatAreaDesignation("0035", "Juinen")).toBe("0035 - Juinen");
  });

  test("Election formatElectionTypeLabel", () => {
    expect(formatElectionTypeLabel("0035", "Heemdamseburg", "GSB")).toBe("GSB 0035 Heemdamseburg");
    expect(formatElectionTypeLabel("CSB", "Heemdamseburg", "CSB")).toBe("CSB Heemdamseburg");
  });
});
