import type { StoryFn } from "@storybook/react-vite";

import * as gte19Seats from "../../testing/gte-19-seats";
import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";

export const Default: StoryFn = () => (
  <ResidualSeatsCalculationTable
    seats={gte19Seats.seat_assignment.seats}
    fullSeats={gte19Seats.seat_assignment.full_seats}
    residualSeats={gte19Seats.seat_assignment.residual_seats}
  />
);

export default {};
