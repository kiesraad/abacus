import type { StoryFn } from "@storybook/react-vite";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import { getRemovalSteps, isAbsoluteMajorityReassignmentStep } from "../../utils/steps";
import { Footnotes } from "./Footnotes";

export const Default: StoryFn = () => {
  const seatAssignment = lt19SeatsAndP9AndP10.seat_assignment;
  const absoluteMajorityStep = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  const { residualSeatRemovalSteps, listsWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);

  return (
    <Footnotes
      listsWithFullSeatsRemoved={listsWithFullSeatsRemoved}
      seatAssignment={seatAssignment}
      absoluteMajorityStep={absoluteMajorityStep}
      residualSeatRemovalSteps={residualSeatRemovalSteps}
    />
  );
};

export default {};
