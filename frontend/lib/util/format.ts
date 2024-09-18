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
  return parseInt(cleaned, 10);
}

export function validateNumberString(s: string | null | undefined) {
  if (s === null || s === undefined || s === "") return false;
  const result = s.trim();
  return !!result.match(/^(\d*\.?)$|^(\d{1,3}(\.\d{3})+\.?)$/g);
}
