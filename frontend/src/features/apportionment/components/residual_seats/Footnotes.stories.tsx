import type { StoryFn } from "@storybook/react-vite";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import { getRemovalSteps, isAbsoluteMajorityReassignmentStep } from "../../utils/steps";
import { Footnotes } from "./Footnotes";

export const Default: StoryFn = () => {
  const seatAssignment = lt19SeatsAndP9AndP10.seat_assignment;
  const absoluteMajorityReassignment = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  const { residualSeatRemovalSteps, uniquePgNumbersWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);

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
