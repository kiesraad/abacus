import type { StoryFn } from "@storybook/react-vite";

import * as lt19Seats from "../../testing/lt-19-seats";

import { LargestRemaindersTable } from "./LargestRemaindersTable";

export const Default: StoryFn = () => (
  <LargestRemaindersTable
    steps={lt19Seats.largest_remainder_steps}
    finalStanding={lt19Seats.seat_assignment.final_standing}
    politicalGroups={lt19Seats.election.political_groups}
    resultChanges={[]}
  />
);

export default {};
