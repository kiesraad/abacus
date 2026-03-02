import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../testing/gte-19-seats";
import { ApportionmentTable } from "./ApportionmentTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <ApportionmentTable
        finalStanding={gte19Seats.seat_assignment.final_standing}
        politicalGroups={gte19Seats.election.political_groups}
        fullSeats={gte19Seats.seat_assignment.full_seats}
        residualSeats={gte19Seats.seat_assignment.residual_seats}
        seats={gte19Seats.seat_assignment.seats}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
      ["1", "Political Group A", "11", "1", "12"],
      ["2", "Political Group B", "5", "1", "6"],
      ["3", "Political Group C", "1", "-", "1"],
      ["4", "Political Group D", "1", "1", "2"],
      ["5", "Political Group E", "1", "1", "2"],
      ["", "Totaal", "19", "4", "23"],
    ]);
  },
};

export default {};
