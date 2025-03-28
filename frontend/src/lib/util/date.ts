export function localDateToUtc(date: string): string {
  return new Date(date).toISOString();
}

export function utcToLocalDate(dateString: string): string {
  const date = new Date(dateString);
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? "+" : "-";
  const pad = (num: number) => `${num < 10 ? "0" : ""}${num}`;

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    dif,
    pad(Math.floor(Math.abs(tzo) / 60)),
    ":",
    pad(Math.abs(tzo) % 60),
  ].join("");
}
