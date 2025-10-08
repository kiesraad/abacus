// timestamp to local date string
export function timestampToDateString(timestamp: string | undefined): string {
  if (!timestamp) {
    return "";
  }

  const d = new Date();
  const time = new Date(parseInt(timestamp) * 1000 - d.getTimezoneOffset() * 60000);

  return time.toISOString().slice(0, 16);
}

// local date string to timestamp
export function dateToTimestampString(date: string): string {
  if (!date) {
    return "";
  }

  const time = new Date(date);

  return Math.round(time.getTime() / 1000).toString();
}
