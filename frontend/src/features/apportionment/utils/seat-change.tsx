import { JSX } from "react/jsx-runtime";

import {
  AbsoluteMajorityReassignedSeat,
  HighestAverageAssignedSeat,
  LargestRemainderAssignedSeat,
  ListExhaustionRemovedSeat,
  SeatChangeStep,
} from "@/api/gen/openapi";

import cls from "../components/Apportionment.module.css";

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
  residualSeatRemovalSteps: ListExhaustionRemovalStep[],
) {
  const resultChanges: resultChange[] = [];
  let footnoteNumber = absoluteMajorityReassignment ? 1 : 0;
  if (absoluteMajorityReassignment) {
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
  residualSeatRemovalSteps.forEach((step) => {
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

export type HighestAverageAssignmentStep = SeatChangeStep & { change: HighestAverageAssignedSeat };
export type UniqueHighestAverageAssignmentStep = SeatChangeStep & { change: HighestAverageAssignedSeat };
export type LargestRemainderAssignmentStep = SeatChangeStep & { change: LargestRemainderAssignedSeat };
export type AbsoluteMajorityReassignmentStep = SeatChangeStep & { change: AbsoluteMajorityReassignedSeat };
export type ListExhaustionRemovalStep = SeatChangeStep & { change: ListExhaustionRemovedSeat };

export function isHighestAverageAssignmentStep(step: SeatChangeStep): step is HighestAverageAssignmentStep {
  return step.change.changed_by === "HighestAverageAssignment";
}

export function isUniqueHighestAverageAssignmentStep(step: SeatChangeStep): step is UniqueHighestAverageAssignmentStep {
  return step.change.changed_by === "UniqueHighestAverageAssignment";
}

export function isLargestRemainderAssignmentStep(step: SeatChangeStep): step is LargestRemainderAssignmentStep {
  return step.change.changed_by === "LargestRemainderAssignment";
}

export function isAbsoluteMajorityReassignmentStep(step: SeatChangeStep): step is AbsoluteMajorityReassignmentStep {
  return step.change.changed_by === "AbsoluteMajorityReassignment";
}

export function isListExhaustionRemovalStep(step: SeatChangeStep): step is ListExhaustionRemovalStep {
  return step.change.changed_by === "ListExhaustionRemoval";
}

export function getFootnotes(pgResultChanges: resultChange[]) {
  const footnoteNumbers = pgResultChanges.map((pgResultChange) => pgResultChange.footnoteNumber);
  const footnoteLinks: JSX.Element[] = [];
  footnoteNumbers.forEach((footnoteNumber, index) => {
    if (index > 0) {
      footnoteLinks.push(<span key={`comma-${index}`}>,</span>);
    }
    footnoteLinks.push(
      <a href={`#footnote-${footnoteNumber}`} key={`footnoteLink-${footnoteNumber}`}>
        {footnoteNumber}
      </a>,
    );
  });
  return <sup className={cls.footnoteNumber}>{footnoteLinks}</sup>;
}
