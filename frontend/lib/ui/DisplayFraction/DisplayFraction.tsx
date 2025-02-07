import { ReactNode } from "react";

import { Fraction } from "@kiesraad/api";
import { formatNumber } from "@kiesraad/util";

import cls from "./DisplayFraction.module.css";

export function DisplayFraction({ id, fraction }: { id: string; fraction: Fraction }): ReactNode {
  return (
    <div id={id} className={cls.displayFraction}>
      <span>{fraction.integer ? formatNumber(fraction.integer) : fraction.numerator === 0 ? "0" : ""}</span>
      {fraction.numerator > 0 && (
        <span>
          {fraction.numerator}/{fraction.denominator}
        </span>
      )}
    </div>
  );
}
