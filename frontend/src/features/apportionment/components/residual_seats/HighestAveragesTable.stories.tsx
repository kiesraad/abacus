import type { StoryFn } from "@storybook/react-vite";

import * as gte19Seats from "../../testing/gte-19-seats";
import type { HighestAverageAssignmentStep } from "../../utils/steps";
import { HighestAveragesTable } from "./HighestAveragesTable";

export const Default: StoryFn = () => (
  <HighestAveragesTable
    steps={gte19Seats.seat_assignment.steps as HighestAverageAssignmentStep[]}
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups}
    resultChanges={[]}
  />
);

export default {};
