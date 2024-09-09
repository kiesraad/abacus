const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

export function formatNumber(number: number): string {
  return numberFormatter.format(number);
}
