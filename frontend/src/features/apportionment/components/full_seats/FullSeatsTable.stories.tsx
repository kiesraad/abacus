import type { StoryFn } from "@storybook/react-vite";

import * as gte19Seats from "../../testing/gte-19-seats";
import { FullSeatsTable } from "./FullSeatsTable";

export const Default: StoryFn = () => (
  <FullSeatsTable
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups}
    quota={gte19Seats.seat_assignment.quota}
    resultChanges={[]}
  />
);

export default {};
