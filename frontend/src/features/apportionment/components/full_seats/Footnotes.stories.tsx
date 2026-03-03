import type { StoryFn } from "@storybook/react-vite";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import { getRemovalSteps } from "../../utils/steps";
import { Footnotes } from "./Footnotes";

export const Default: StoryFn = () => {
  const { fullSeatRemovalSteps } = getRemovalSteps(lt19SeatsAndP9AndP10.seat_assignment);

  return <Footnotes fullSeatRemovalSteps={fullSeatRemovalSteps} />;
};

export default {};
