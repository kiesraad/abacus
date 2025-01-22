import { t } from "@kiesraad/i18n";

const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

export function formatNumber(s: string | number | null | undefined | readonly string[]) {
  if (typeof s !== "string" && typeof s !== "number") return "";
  let result = `${s}`.replace(/\D/g, "");
  if (result === "") return "";
  result = numberFormatter.format(Number(result));
  return result;
}

export function deformatNumber(s: string) {
  const separator = numberFormatter.format(11111).replace(/\p{Number}/gu, "");
  const escapedSeparator = separator.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

  let cleaned = s.replace(new RegExp(escapedSeparator, "g"), "");
  // Make sure empty value is converted to 0 instead of null
  if (cleaned == "") {
    cleaned = "0";
  }
  return parseInt(cleaned);
}

export function validateNumberString(s: string | null | undefined) {
  if (s === null || s === undefined || s === "") return false;
  const result = s.trim();
  return !!result.match(/^(\d*\.?)$|^(\d{1,3}(\.\d{3})+\.?)$/g);
}

export function formatDateTime(date: Date) {
  const today = new Date();
  const timeString = date.toLocaleTimeString(t("date_locale"), { hour: "numeric", minute: "numeric" });
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    // Today
    return `${t("today")} ${timeString}`;
  } else if (Math.round(Math.abs(Number(today) - Number(date)) / (24 * 60 * 60 * 1000)) < 7) {
    // Within the past 6 days
    return date.toLocaleString(t("date_locale"), {
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
    });
  } else {
    // More than 6 days ago (or in the future)
    const dateString = date.toLocaleDateString(t("date_locale"), { day: "numeric", month: "short" });
    return `${dateString} ${timeString}`;
  }
}
