import type {
  AbsoluteMajorityReassignedSeat,
  HighestAverageAssignedSeat,
  LargestRemainderAssignedSeat,
  ListExhaustionRemovedSeat,
  SeatAssignmentResult,
  SeatChangeStep,
} from "@/types/generated/openapi";

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

export function getAssignmentSteps(
  seatAssignment: SeatAssignmentResult,
): [
  LargestRemainderAssignmentStep[],
  UniqueHighestAverageAssignmentStep[],
  HighestAverageAssignmentStep[],
  AbsoluteMajorityReassignmentStep | undefined,
] {
  const largestRemainderSteps = seatAssignment.steps.filter(isLargestRemainderAssignmentStep);
  const uniqueHighestAverageSteps = seatAssignment.steps.filter(isUniqueHighestAverageAssignmentStep);
  const highestAverageSteps = seatAssignment.steps.filter(isHighestAverageAssignmentStep);

  const absoluteMajorityReassignment = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  return [largestRemainderSteps, uniqueHighestAverageSteps, highestAverageSteps, absoluteMajorityReassignment];
}

export function getRemovalSteps(
  seatAssignment: SeatAssignmentResult,
): [ListExhaustionRemovalStep[], ListExhaustionRemovalStep[], number[]] {
  const listExhaustionSteps = seatAssignment.steps.filter(isListExhaustionRemovalStep);
  const fullSeatRemovalSteps = listExhaustionSteps.filter((step) => step.change.full_seat);
  const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);

  const uniquePgNumbersWithFullSeatsRemoved: number[] = [];
  fullSeatRemovalSteps.forEach((step) => {
    if (!uniquePgNumbersWithFullSeatsRemoved.includes(step.change.pg_retracted_seat)) {
      uniquePgNumbersWithFullSeatsRemoved.push(step.change.pg_retracted_seat);
    }
  });
  return [fullSeatRemovalSteps, residualSeatRemovalSteps, uniquePgNumbersWithFullSeatsRemoved];
}
