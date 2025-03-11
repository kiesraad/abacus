import { t } from "@kiesraad/i18n";

const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

export function formatNumber(s: string | number | null | undefined | readonly string[]) {
  if (typeof s !== "string" && typeof s !== "number") return "";
  const result = `${s}`.replace(/\D/g, "");
  if (result === "") {
    return "";
  } else {
    return numberFormatter.format(Number(result));
  }
}

export function deformatNumber(s: string) {
  const cleaned = s.replace(/[.]/g, "");
  if (cleaned == "") {
    // An empty value should be parsed as 0
    return 0;
  } else {
    return parseInt(cleaned);
  }
}

export function validateNumberString(s: string | null | undefined) {
  if (s === null || s === undefined || s === "") return false;
  const result = s.trim();
  return !!result.match(/^(\d*\.?)$|^(\d{1,3}(\.\d{3})+\.?)$/g);
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

export function formatDateTime(date: Date, relative = true) {
  const timeString = date.toLocaleTimeString(t("date_locale"), { hour: "numeric", minute: "numeric" });

  if (relative) {
    const today = new Date();

    if (isToday(date)) {
      // Today
      return `${t("today")} ${timeString}`;
    }

    if (isYesterday(date)) {
      // Yesterday
      return `${t("yesterday")} ${timeString}`;
    }

    if (Math.round(Math.abs(Number(today) - Number(date)) / (24 * 60 * 60 * 1000)) < 7) {
      // Within the past 3-6 days
      return date.toLocaleString(t("date_locale"), {
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
      });
    }
  }

  // More than 6 days ago (or in the future)
  const dateString = date.toLocaleDateString(t("date_locale"), { day: "numeric", month: "short" });
  return `${dateString} ${timeString}`;
}
