import type { StoryFn } from "@storybook/react-vite";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import { isAbsoluteMajorityReassignmentStep, isListExhaustionRemovalStep } from "../../utils/seat-change";
import { Footnotes } from "./Footnotes";

export const Default: StoryFn = () => {
  const seatAssignment = lt19SeatsAndP9AndP10.seat_assignment;
  const absoluteMajorityReassignment = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  const listExhaustionSteps = seatAssignment.steps.filter(isListExhaustionRemovalStep);
  const fullSeatRemovalSteps = listExhaustionSteps.filter((step) => step.change.full_seat);
  const residualSeatRemovalSteps = listExhaustionSteps.filter((step) => !step.change.full_seat);
  const uniquePgNumbersWithFullSeatsRemoved: number[] = [];
  fullSeatRemovalSteps.forEach((step) => {
    if (!uniquePgNumbersWithFullSeatsRemoved.includes(step.change.pg_retracted_seat)) {
      uniquePgNumbersWithFullSeatsRemoved.push(step.change.pg_retracted_seat);
    }
  });
  return (
    <Footnotes
      uniquePgNumbersWithFullSeatsRemoved={uniquePgNumbersWithFullSeatsRemoved}
      seatAssignment={seatAssignment}
      absoluteMajorityReassignment={absoluteMajorityReassignment}
      residualSeatRemovalSteps={residualSeatRemovalSteps}
    />
  );
};

export default {};
