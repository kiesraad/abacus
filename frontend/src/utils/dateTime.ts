import { t } from "@/i18n/translate";

const NL_DATE_FORMAT_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const TIME_FORMAT_REGEX = /^(\d{1,2}):(\d{2})$/;

export type DateValidationResult = "valid" | "invalid_format" | "invalid_date" | "invalid_year";
export type TimeValidationResult = "valid" | "invalid_format" | "invalid_time";

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

export function formatDateFull(date: Date) {
  return new Intl.DateTimeFormat(t("date_locale"), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateFullWithoutWeekday(date: Date) {
  return new Intl.DateTimeFormat(t("date_locale"), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeFull(date: Date) {
  return date.toLocaleTimeString(t("date_locale"), {
    hour: "numeric",
    minute: "numeric",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeFullWithoutWeekday(date: Date) {
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
      return `${t("today")} om ${timeString}`;
    }

    if (isYesterday(date)) {
      // Yesterday
      return `${t("yesterday")} om ${timeString}`;
    }

    if (Math.round(Math.abs(Number(today) - Number(date)) / (24 * 60 * 60 * 1000)) < 7) {
      // Within the past 3-6 days
      return `${date.toLocaleString(t("date_locale"), {
        weekday: "long",
      })} om ${timeString}`;
    }
  }

  // More than 6 days ago (or in the future)
  const dateString = date.toLocaleDateString(t("date_locale"), { day: "numeric", month: "short" });
  return `${dateString} om ${timeString}`;
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(t("date_locale"), {
    hour: "2-digit",
    minute: "2-digit",
  });
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

  let minutesFormatted: string;

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

/** Validate a date in dd-mm-yyyy format: first the format, then whether the date exists, then the year (2000-2099) */
export function validateNLDate(date: string): DateValidationResult {
  const match = NL_DATE_FORMAT_REGEX.exec(date);
  if (!match) {
    return "invalid_format";
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  // Use a UTC date to check that the day exists in the given month (e.g. no 31-02 or 29-02 in non-leap years)
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return "invalid_date";
  }

  if (year < 2000 || year > 2099) {
    return "invalid_year";
  }

  return "valid";
}

export function isValidNLDate(date: string) {
  return validateNLDate(date) === "valid";
}

/** Validate a time in hh:mm (or h:mm) format: first the format, then whether the hours and minutes are in range */
export function validateTime(time: string): TimeValidationResult {
  const match = TIME_FORMAT_REGEX.exec(time);
  if (!match) {
    return "invalid_format";
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return "invalid_time";
  }

  return "valid";
}

export function isValidTime(time: string) {
  return validateTime(time) === "valid";
}

/** Convert date from dd-mm-yyyy to yyyy-mm-dd */
export function convertNLDateToISODate(date: string) {
  const result = validateNLDate(date);
  if (result !== "valid") {
    throw new Error(`Error: ${date} has an invalid date format, should be: dd-mm-yyyy`);
  }
  const [day, month, year] = date.split("-");
  return `${year}-${month}-${day}`;
}
