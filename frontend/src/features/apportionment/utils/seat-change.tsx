import type { JSX } from "react/jsx-runtime";

import cls from "../components/Apportionment.module.css";
import type { AbsoluteMajorityReassignmentStep, ListExhaustionRemovalStep } from "./steps";

export interface resultChange {
  pgNumber: number;
  footnoteNumber: number;
  increase: number;
  decrease: number;
  type: "full_seat" | "residual_seat";
}

export function getResultChanges(
  absoluteMajorityReassignment: AbsoluteMajorityReassignmentStep | undefined,
  uniquePgNumbersWithFullSeatsRemoved: number[],
  residualSeatRemovalSteps: ListExhaustionRemovalStep[] | undefined,
) {
  const resultChanges: resultChange[] = [];
  let footnoteNumber = 0;
  uniquePgNumbersWithFullSeatsRemoved.forEach((pgNumber) => {
    footnoteNumber += 1;
    resultChanges.push({
      pgNumber: pgNumber,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 1,
      type: "full_seat",
    });
  });
  if (absoluteMajorityReassignment) {
    footnoteNumber += 1;
    resultChanges.push({
      pgNumber: absoluteMajorityReassignment.change.pg_assigned_seat,
      footnoteNumber: footnoteNumber,
      increase: 1,
      decrease: 0,
      type: "residual_seat",
    });
    resultChanges.push({
      pgNumber: absoluteMajorityReassignment.change.pg_retracted_seat,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 1,
      type: "residual_seat",
    });
  }
  residualSeatRemovalSteps?.forEach((step) => {
    footnoteNumber += 1;
    resultChanges.push({
      pgNumber: step.change.pg_retracted_seat,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 1,
      type: "residual_seat",
    });
  });
  return resultChanges;
}

export function getFootnotes(pgResultChanges: resultChange[]) {
  const footnoteNumbers = pgResultChanges.map((pgResultChange) => pgResultChange.footnoteNumber);
  const footnoteLinks: JSX.Element[] = [];
  footnoteNumbers.forEach((footnoteNumber, index) => {
    if (index > 0) {
      footnoteLinks.push(<span key={`comma-${footnoteNumber}`}>,</span>);
    }
    footnoteLinks.push(
      <a href={`#footnote-${footnoteNumber}`} key={`footnoteLink-${footnoteNumber}`}>
        {footnoteNumber}
      </a>,
    );
  });
  return <sup className={cls.footnoteNumber}>{footnoteLinks}</sup>;
}
