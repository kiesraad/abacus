import type { StoryFn } from "@storybook/react-vite";
import type { ApportionmentState } from "@/types/generated/openapi";
import * as gte19SeatsAndP9DrawingLots from "../../testing/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates";
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
      state={
        {
          type: "Finalised",
          deceased_candidates: [],
          lists_drawn: [],
          candidates_drawn: [],
        } satisfies ApportionmentState
      }
    />
  );
};

export const P9BeforeDrawingLots: StoryFn = () => {
  const seatAssignment = gte19SeatsAndP9DrawingLots.seat_assignment;
  const absoluteMajorityStep = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  const { residualSeatRemovalSteps, listsWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);

  return (
    <Footnotes
      listsWithFullSeatsRemoved={listsWithFullSeatsRemoved}
      seatAssignment={seatAssignment}
      absoluteMajorityStep={absoluteMajorityStep}
      residualSeatRemovalSteps={residualSeatRemovalSteps}
      state={gte19SeatsAndP9DrawingLots.state}
    />
  );
};

export const P9AfterDrawingLots: StoryFn = () => {
  const seatAssignment = gte19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned;
  const absoluteMajorityStep = seatAssignment.steps.find(isAbsoluteMajorityReassignmentStep);
  const { residualSeatRemovalSteps, listsWithFullSeatsRemoved } = getRemovalSteps(seatAssignment);

  return (
    <Footnotes
      listsWithFullSeatsRemoved={listsWithFullSeatsRemoved}
      seatAssignment={seatAssignment}
      absoluteMajorityStep={absoluteMajorityStep}
      residualSeatRemovalSteps={residualSeatRemovalSteps}
      state={gte19SeatsAndP9DrawingLots.state_after_drawing_lots_seat_reassigned}
    />
  );
};

export default {};
