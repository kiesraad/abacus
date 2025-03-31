import { describe, expect, test } from "vitest";

import { t } from "@kiesraad/i18n";

import {
  deformatNumber,
  formatDateTime,
  formatDateTimeFull,
  formatNumber,
  formatTimeToGo,
  validateNumberString,
} from "./format";

describe("Format util", () => {
  test.each([
    ["0", "0"],
    ["000", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
  ])("Number validate, format and deformat string %s as %s", (input: string, expected: string) => {
    expect(validateNumberString(input)).toBe(true);
    expect(formatNumber(input)).toBe(expected);
    expect(deformatNumber(expected)).toBe(parseInt(input, 10));
  });

  test.each([
    ["", ""],
    ["0", "0"],
    ["000", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
  ])("Number format string %s as %s", (input: string, expected: string) => {
    expect(formatNumber(input)).toBe(expected);
  });

  test.each([
    ["", 0],
    ["0", 0],
    ["000", 0],
    ["8", 8],
    ["10", 10],
    ["1.000", 1_000],
    ["12.345", 12_345],
    ["123.456", 123_456],
    ["1000000", 1_000_000],
    ["1.000.000", 1_000_000],
    ["x", NaN],
  ])("Deformat number %s as %s", (input: string, expected: number) => {
    expect(deformatNumber(input)).toBe(expected);
  });

  const today = new Date();
  today.setHours(10, 20);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const day_before_yesterday = new Date(today);
  day_before_yesterday.setDate(today.getDate() - 2);
  const one_week_ago = new Date(today);
  one_week_ago.setDate(today.getDate() - 7);
  test.each([
    [today, `${t("today")} 10:20`, true],
    [yesterday, `${t("yesterday")} 10:20`, true],
    [day_before_yesterday, `${day_before_yesterday.toLocaleString(t("date_locale"), { weekday: "long" })} 10:20`, true],
    [one_week_ago, `${one_week_ago.toLocaleString(t("date_locale"), { day: "numeric", month: "short" })} 10:20`, true],
    [today, `${today.toLocaleString(t("date_locale"), { day: "numeric", month: "short" })} 10:20`, false],
    [yesterday, `${yesterday.toLocaleString(t("date_locale"), { day: "numeric", month: "short" })} 10:20`, false],
    [
      day_before_yesterday,
      `${day_before_yesterday.toLocaleString(t("date_locale"), { day: "numeric", month: "short" })} 10:20`,
      false,
    ],
    [one_week_ago, `${one_week_ago.toLocaleString(t("date_locale"), { day: "numeric", month: "short" })} 10:20`, false],
  ])("Date format string %s as %s", (input: Date, expected: string, relative: boolean) => {
    expect(formatDateTime(input, relative)).toEqual(expected);
  });

  test.each([
    [new Date("Fri Oct 17 2008 05:09:20 GMT+0200"), new RegExp(/\d+ oktober 2008 om \d\d:\d\d/)],
    [new Date("Sat Jun 03 2023 14:26:13 GMT+0200"), new RegExp(/\d+ juni 2023 om \d\d:\d\d/)],
    [new Date("Sat Dec 18 2010 23:27:11 GMT+0100"), new RegExp(/\d+ december 2010 om \d\d:\d\d/)],
  ])("Format date time %s as %s", (input: Date, expected: RegExp) => {
    expect(formatDateTimeFull(input)).toMatch(expected);
  });

  test.each([
    [0, "0 seconden"],
    [0.6, "1 seconde"],
    [1, "1 seconde"],
    [10, "10 seconden"],
    [60, "1 minuut"],
    [61, "1 minuut en 1 seconde"],
    [70, "1 minuut en 10 seconden"],
    [1000, "16 minuten en 40 seconden"],
    [1337 * 60, "1337 minuten"],
    [1337 * 60 + 42, "1337 minuten en 42 seconden"],
  ])("Time to go %s formatted as %s", (input: number, expected: string) => {
    expect(formatTimeToGo(input)).toBe(expected);
  });
});
