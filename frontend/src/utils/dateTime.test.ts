import { describe, expect, test } from "vitest";

import { t } from "@/i18n/translate";

import {
  convertNLDateToISODate,
  formatDateFull,
  formatDateTime,
  formatDateTimeFull,
  formatTimeToGo,
  isValidNLDate,
  isValidTime,
} from "./dateTime";

describe("DateTime util", () => {
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
    [new Date("Fri Oct 17 2008 05:09:20 GMT+0200"), /\d+ oktober 2008 om \d\d:\d\d/],
    [new Date("Sat Jun 03 2023 14:26:13 GMT+0200"), /\d+ juni 2023 om \d\d:\d\d/],
    [new Date("Sat Dec 18 2010 23:27:11 GMT+0100"), /\d+ december 2010 om \d\d:\d\d/],
  ])("Format date time %s as %s", (input: Date, expected: RegExp) => {
    expect(formatDateTimeFull(input)).toMatch(expected);
  });

  test.each([
    [new Date("Fri Oct 17 2008 05:09:20 GMT+0200"), /\d+ oktober 2008/],
    [new Date("Sat Jun 03 2023 14:26:13 GMT+0200"), /\d+ juni 2023/],
    [new Date("Sat Dec 18 2010 23:27:11 GMT+0100"), /\d+ december 2010/],
  ])("Format date %s as %s", (input: Date, expected: RegExp) => {
    expect(formatDateFull(input)).toMatch(expected);
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

  test.each([
    ["01-01-2026", true],
    ["10-10-2026", true],
    ["21-11-2026", true],
    ["31-12-2025", true],
    ["12-31-2025", false],
    ["2025-12-31", false],
    ["31 januari 2025", false],
    ["", false],
  ])("NL date %s is valid %s", (input: string, expected: boolean) => {
    expect(isValidNLDate(input)).toEqual(expected);
  });

  test.each([
    ["09:15", true],
    ["9:15", false],
    ["9 uur", false],
    ["", false],
  ])("Time %s is valid %s", (input: string, expected: boolean) => {
    expect(isValidTime(input)).toEqual(expected);
  });

  test("convert date should work for valid NL date format", () => {
    expect(convertNLDateToISODate("31-12-2025")).toEqual("2025-12-31");
  });

  test("convert date should throw error for invalid NL date format", () => {
    expect(() => {
      convertNLDateToISODate("2025-12-31");
    }).toThrowError("Error: 2025-12-31 has an invalid date format, should be: dd-mm-yyyy");
  });
});
