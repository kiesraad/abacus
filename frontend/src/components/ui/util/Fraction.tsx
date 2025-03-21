import { Fraction } from "@kiesraad/api";
import { formatNumber } from "@kiesraad/util";

export function getFractionInteger(fraction: Fraction) {
  return fraction.integer ? formatNumber(fraction.integer) : fraction.numerator === 0 ? "0" : "";
}

export function getFractionWithoutInteger(fraction: Fraction) {
  return fraction.numerator > 0 ? `${fraction.numerator}/${fraction.denominator}` : "";
}
