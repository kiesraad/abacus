import type {
  AbsoluteMajorityReassignedSeat,
  HighestAverageAssignedSeat,
  LargestRemainderAssignedSeat,
  ListExhaustionRemovedSeat,
  SeatAssignment,
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

export interface AssignmentSteps {
  largestRemainderSteps: LargestRemainderAssignmentStep[];
  uniqueHighestAverageSteps: UniqueHighestAverageAssignmentStep[];
  highestAverageSteps: HighestAverageAssignmentStep[];
  absoluteMajorityStep?: AbsoluteMajorityReassignmentStep;
}

export function getAssignmentSteps(seatAssignment: SeatAssignment): AssignmentSteps {
  return {
    largestRemainderSteps: seatAssignment.steps.filter(isLargestRemainderAssignmentStep),
    uniqueHighestAverageSteps: seatAssignment.steps.filter(isUniqueHighestAverageAssignmentStep),
    highestAverageSteps: seatAssignment.steps.filter(isHighestAverageAssignmentStep),
    absoluteMajorityStep: seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep),
  };
}

export interface RemovalSteps {
  fullSeatRemovalSteps: ListExhaustionRemovalStep[];
  residualSeatRemovalSteps: ListExhaustionRemovalStep[];
  listsWithFullSeatsRemoved: number[];
}

export function getRemovalSteps(seatAssignment: SeatAssignment): RemovalSteps {
  const listExhaustionSteps = seatAssignment.steps.filter(isListExhaustionRemovalStep);
  const fullSeatRemovalSteps = listExhaustionSteps.filter((step) => step.change.full_seat);
  const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);

  const listsWithFullSeatsRemoved: number[] = [];
  fullSeatRemovalSteps.forEach((step) => {
    if (!listsWithFullSeatsRemoved.includes(step.change.list_retracted_seat)) {
      listsWithFullSeatsRemoved.push(step.change.list_retracted_seat);
    }
  });
  return { fullSeatRemovalSteps, residualSeatRemovalSteps, listsWithFullSeatsRemoved };
}
