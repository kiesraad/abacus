import { Fraction } from "@/types/generated/openapi";

import { formatNumber } from "./number";

export function getFractionInteger(fraction: Fraction) {
  return fraction.integer ? formatNumber(fraction.integer) : fraction.numerator === 0 ? "0" : "";
}

export function getFractionWithoutInteger(fraction: Fraction) {
  return fraction.numerator > 0 ? `${fraction.numerator}/${fraction.denominator}` : "";
}
