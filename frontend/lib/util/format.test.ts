import { describe, expect, test } from "vitest";

import { t } from "@kiesraad/i18n";

import { deformatNumber, formatDateTime, formatNumber, validateNumberString } from "./format";

describe("Format util", () => {
  test.each([
    ["0", "0"],
    ["8", "8"],
    ["10", "10"],
    ["1000", "1.000"],
    ["12345", "12.345"],
    ["123456", "123.456"],
    ["1000000", "1.000.000"],
  ])("Number format string %s as %s", (input: string, expected: string) => {
    expect(validateNumberString(input)).equals(true);
    expect(formatNumber(input)).equals(expected);
    expect(deformatNumber(expected)).equals(parseInt(input, 10));
  });

  const today = new Date();
  today.setHours(10, 20);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const one_week_ago = new Date(today);
  one_week_ago.setDate(today.getDate() - 7);
  test.each([
    [today, `${t("today")} 10:20`],
    [yesterday, `${yesterday.toLocaleString(t("date_locale"), { weekday: "long" })} 10:20`],
    [one_week_ago, `${one_week_ago.toLocaleString(t("date_locale"), { day: "numeric", month: "short" })} 10:20`],
  ])("Date format string %s as %s", (input: Date, expected: string) => {
    expect(formatDateTime(input)).equals(expected);
  });
});
