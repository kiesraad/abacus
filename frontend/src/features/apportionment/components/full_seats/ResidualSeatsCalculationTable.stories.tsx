import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../../testing/gte-19-seats";
import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <ResidualSeatsCalculationTable
        seats={gte19Seats.seat_assignment.seats}
        fullSeats={gte19Seats.seat_assignment.full_seats}
        residualSeats={gte19Seats.seat_assignment.residual_seats}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Totaal aantal zetels", "23", ""],
      ["Totaal aantal toegewezen volle zetels", "19", "— (min)"],
      ["Restzetels", "4", ""],
    ]);
  },
};

export default {};
