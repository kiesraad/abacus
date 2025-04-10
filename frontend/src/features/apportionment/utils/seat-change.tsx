import { JSX } from "react/jsx-runtime";

import {
  AbsoluteMajorityReassignedSeat,
  HighestAverageAssignedSeat,
  LargestRemainderAssignedSeat,
  ListExhaustionRemovedSeat,
  SeatChangeStep,
} from "@/api";

import cls from "../components/Apportionment.module.css";

export interface resultChange {
  pgNumber: number;
  footnoteNumber: number;
  increase: number;
  decrease: number;
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

export function getAssignedSeat(step: SeatChangeStep): number | undefined {
  if (
    isHighestAverageAssignmentStep(step) ||
    isUniqueHighestAverageAssignmentStep(step) ||
    isLargestRemainderAssignmentStep(step)
  ) {
    return step.change.selected_pg_number;
  } else if (isAbsoluteMajorityReassignmentStep(step)) {
    return step.change.pg_assigned_seat;
  } else {
    return undefined;
  }
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
