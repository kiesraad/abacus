import { ReactNode } from "react";

import { Fraction } from "@kiesraad/api";
import { formatNumber } from "@kiesraad/util";

import cls from "./DisplayFraction.module.css";

export function DisplayFraction({ fraction }: { fraction: Fraction }): ReactNode {
  return (
    <div className={cls.displayFraction}>
      <span>{fraction.integer ? formatNumber(fraction.integer) : ""}</span>
      <span>
        {fraction.numerator}/{fraction.denominator}
      </span>
    </div>
  );
}
