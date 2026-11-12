import type { SeatAssignment, SeatChange, SeatChangeStep } from "@/types/generated/openapi";

export type SpecificStep<T extends SeatChange["changed_by"]> = SeatChangeStep & {
  change: Extract<SeatChange, { changed_by: T }>;
};

function isSpecificStep<T extends SeatChange["changed_by"]>(changedBy: T) {
  return (step: SeatChangeStep): step is SpecificStep<T> => step.change.changed_by === changedBy;
}

export type HighestAverageAssignmentStep = SpecificStep<"HighestAverageAssignment">;
export type UniqueHighestAverageAssignmentStep = SpecificStep<"UniqueHighestAverageAssignment">;
export type LargestRemainderAssignmentStep = SpecificStep<"LargestRemainderAssignment">;
export type AbsoluteMajorityReassignmentStep = SpecificStep<"AbsoluteMajorityReassignment">;
export type ListExhaustionRemovalStep = SpecificStep<"ListExhaustionRemoval">;

export const isHighestAverageAssignmentStep = isSpecificStep("HighestAverageAssignment");
export const isUniqueHighestAverageAssignmentStep = isSpecificStep("UniqueHighestAverageAssignment");
export const isLargestRemainderAssignmentStep = isSpecificStep("LargestRemainderAssignment");
export const isAbsoluteMajorityReassignmentStep = isSpecificStep("AbsoluteMajorityReassignment");
export const isListExhaustionRemovalStep = isSpecificStep("ListExhaustionRemoval");

export interface RemovalSteps {
  fullSeatRemovalSteps: ListExhaustionRemovalStep[];
  residualSeatRemovalSteps: ListExhaustionRemovalStep[];
  listsWithFullSeatsRemoved: number[];
}

export function getRemovalSteps(seatAssignment: SeatAssignment): RemovalSteps {
  const listExhaustionSteps = seatAssignment.steps.filter(isListExhaustionRemovalStep);
  const fullSeatRemovalSteps = listExhaustionSteps.filter((step) => step.change.full_seat);
  const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);
  const listsWithFullSeatsRemoved = new Set(fullSeatRemovalSteps.map((step) => step.change.list_retracted_seat));

  return {
    fullSeatRemovalSteps,
    residualSeatRemovalSteps,
    listsWithFullSeatsRemoved: Array.from(listsWithFullSeatsRemoved),
  };
}
