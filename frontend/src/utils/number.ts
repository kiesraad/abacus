const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("nl-NL", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(s: string | number | null | undefined | readonly string[]) {
  if ((typeof s !== "string" && typeof s !== "number") || (typeof s === "number" && s === 0)) {
    return "";
  }

  const result = `${s}`.replace(/\D/g, "");
  if (result === "") {
    return "";
  } else {
    return numberFormatter.format(Number(result));
  }
}

export function deformatNumber(s: string) {
  const cleaned = s.replace(/[.]/g, "");
  if (cleaned === "") {
    // An empty value should be parsed as 0
    return 0;
  } else {
    return parseInt(cleaned, 10);
  }
}

export function validateNumberString(s: string | null | undefined) {
  if (s === null || s === undefined || s === "") return false;
  const result = s.trim();
  return !!result.match(/^(\d*\.?)$|^(\d{1,3}(\.\d{3})+\.?)$/g);
}

export function formatPercentage(value: number, total: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || value < 0 || total <= 0) {
    return "";
  }

  return percentageFormatter.format(value / total);
}

export function formatVoteCount(count: number): string {
  return count > 0 ? formatNumber(count) : "0";
}
