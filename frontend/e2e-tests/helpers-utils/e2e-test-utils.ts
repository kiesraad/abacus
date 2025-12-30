import { webcrypto as crypto } from "node:crypto";

const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

export function formatNumber(number: number): string {
  return numberFormatter.format(number);
}

export function createRandomUsername(prefix = "Gebruiker") {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const random = array.toString();
  return prefix + random;
}
