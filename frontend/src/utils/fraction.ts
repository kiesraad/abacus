import type { DisplayFraction } from "@/types/generated/openapi";

import { formatNumber } from "./number";

export function getFractionInteger(fraction: DisplayFraction) {
  return fraction.integer ? formatNumber(fraction.integer) : fraction.numerator === 0 ? "0" : "";
}

export function getFractionWithoutInteger(fraction: DisplayFraction) {
  return fraction.numerator > 0 ? `${fraction.numerator}/${fraction.denominator}` : "";
}
