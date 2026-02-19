import type { StoryFn } from "@storybook/react-vite";

import * as lt19Seats from "../../testing/lt-19-seats";

import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

export const Default: StoryFn = () => (
  <UniqueHighestAveragesTable
    steps={lt19Seats.highest_average_steps}
    finalStanding={lt19Seats.seat_assignment.final_standing}
    politicalGroups={lt19Seats.election.political_groups}
  />
);

export default {};
