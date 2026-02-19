import type { StoryFn } from "@storybook/react-vite";

import * as gte19Seats from "../testing/gte-19-seats";

import { ApportionmentTable } from "./ApportionmentTable";

export const Default: StoryFn = () => (
  <ApportionmentTable
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups}
    fullSeats={gte19Seats.seat_assignment.full_seats}
    residualSeats={gte19Seats.seat_assignment.residual_seats}
    seats={gte19Seats.seat_assignment.seats}
  />
);

export default {};
