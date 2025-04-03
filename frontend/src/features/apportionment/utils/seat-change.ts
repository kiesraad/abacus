import {
  AbsoluteMajorityReassignedSeat,
  HighestAverageAssignedSeat,
  LargestRemainderAssignedSeat,
  ListExhaustionRemovedSeat,
  SeatChangeStep,
} from "@/api";

export type HighestAverageStep = SeatChangeStep & { change: HighestAverageAssignedSeat };
export type LargestRemainderStep = SeatChangeStep & { change: LargestRemainderAssignedSeat };
export type AbsoluteMajorityStep = SeatChangeStep & { change: AbsoluteMajorityReassignedSeat };
export type ListExhaustionRemovalStep = SeatChangeStep & { change: ListExhaustionRemovedSeat };

export function isHighestAverageStep(step: SeatChangeStep): step is HighestAverageStep {
  return step.change.changed_by === "HighestAverageAssignment";
}
export function isLargestRemainderStep(step: SeatChangeStep): step is LargestRemainderStep {
  return step.change.changed_by === "LargestRemainderAssignment";
}
export function isAbsoluteMajorityStep(step: SeatChangeStep): step is AbsoluteMajorityStep {
  return step.change.changed_by === "AbsoluteMajorityReassignment";
}
export function isListExhaustionRemovalStep(step: SeatChangeStep): step is ListExhaustionRemovalStep {
  return step.change.changed_by === "ListExhaustionRemoval";
}
