import type { StoryFn } from "@storybook/react-vite";
import * as gte19SeatsAndP9DrawingLots from "../../testing/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import { Footnotes } from "./Footnotes";

export const Default: StoryFn = () => {
  return <Footnotes seatAssignment={lt19SeatsAndP9AndP10.seat_assignment} state={lt19SeatsAndP9AndP10.state} />;
};

export const P9BeforeDrawingLots: StoryFn = () => {
  return (
    <Footnotes seatAssignment={gte19SeatsAndP9DrawingLots.seat_assignment} state={gte19SeatsAndP9DrawingLots.state} />
  );
};

export const P9AfterDrawingLots: StoryFn = () => {
  return (
    <Footnotes
      seatAssignment={gte19SeatsAndP9DrawingLots.seat_assignment_after_drawing_lots_seat_reassigned}
      state={gte19SeatsAndP9DrawingLots.state_after_drawing_lots_seat_reassigned}
    />
  );
};

export default {};
