import { t } from "@/i18n/translate";

const NL_DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-(20\d{2})$/;
const TIME_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

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

export function formatFullDateWithoutTimezone(date: Date) {
  return new Intl.DateTimeFormat(t("date_locale"), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTimeFull(date: Date) {
  return date.toLocaleTimeString(t("date_locale"), {
    hour: "numeric",
    minute: "numeric",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

export function formatTimeToGo(seconds: number) {
  const secondsRounded = Math.round(seconds);
  const remainingMinutes = Math.floor(secondsRounded / 60);
  const remainingSeconds = secondsRounded % 60;

  let secondsFormatted = "";

  if (remainingSeconds === 1) {
    secondsFormatted = t("one_second");
  } else if (remainingSeconds > 1 || remainingSeconds === 0) {
    secondsFormatted = t("seconds", { seconds: remainingSeconds });
  }

  let minutesFormatted = "";

  if (remainingMinutes === 1) {
    minutesFormatted = t("one_minute");
  } else if (remainingMinutes > 1) {
    minutesFormatted = t("minutes", { minutes: remainingMinutes });
  } else {
    return secondsFormatted;
  }

  if (minutesFormatted && remainingSeconds === 0) {
    return minutesFormatted;
  }

  if (minutesFormatted && secondsFormatted) {
    return `${minutesFormatted} ${t("and")} ${secondsFormatted}`;
  }

  return minutesFormatted;
}

export function isValidNLDate(date: string) {
  return NL_DATE_REGEX.test(date);
}

export function isValidTime(time: string) {
  return TIME_REGEX.test(time);
}

/** Convert date from dd-mm-yyyy to yyyy-mm-dd */
export function convertNLDateToISODate(date: string) {
  if (isValidNLDate(date)) {
    const dateParts = NL_DATE_REGEX.exec(date);
    return `${dateParts?.[3]}-${dateParts?.[2]}-${dateParts?.[1]}`;
  } else {
    throw new Error(`Error: ${date} has an invalid date format, should be: dd-mm-yyyy`);
  }
}
