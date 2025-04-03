import {
  AbsoluteMajorityReassignedSeat,
  HighestAverageAssignedSeat,
  LargestRemainderAssignedSeat,
  ListExhaustionRemovedSeat,
  SeatChangeStep,
} from "@/api";

export type HighestAverageAssignmentStep = SeatChangeStep & { change: HighestAverageAssignedSeat };
export type LargestRemainderAssignmentStep = SeatChangeStep & { change: LargestRemainderAssignedSeat };
export type AbsoluteMajorityReassignmentStep = SeatChangeStep & { change: AbsoluteMajorityReassignedSeat };
export type ListExhaustionRemovalStep = SeatChangeStep & { change: ListExhaustionRemovedSeat };

export function isHighestAverageAssignmentStep(step: SeatChangeStep): step is HighestAverageAssignmentStep {
  return step.change.changed_by === "HighestAverageAssignment";
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
