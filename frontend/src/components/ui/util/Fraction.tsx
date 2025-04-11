import { Fraction } from "@/api/gen/openapi";
import { formatNumber } from "@/lib/util/format";

export function getFractionInteger(fraction: Fraction) {
  return fraction.integer ? formatNumber(fraction.integer) : fraction.numerator === 0 ? "0" : "";
}

export function getFractionWithoutInteger(fraction: Fraction) {
  return fraction.numerator > 0 ? `${fraction.numerator}/${fraction.denominator}` : "";
}
