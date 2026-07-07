import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../testing/gte-19-seats";
import * as gte19SeatsAndP7DrawingLots from "../testing/gte-19-seats-and-p7-drawing-lots";
import { getNotAssignedSeats } from "../utils/utils";
import { ApportionmentTable } from "./ApportionmentTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <ApportionmentTable
        standings={gte19Seats.seat_assignment.standings}
        politicalGroups={gte19Seats.election.political_groups}
        fullSeats={gte19Seats.seat_assignment.full_seats}
        residualSeats={gte19Seats.seat_assignment.residual_seats}
        seats={gte19Seats.seat_assignment.seats}
        notAssignedSeats={0}
        withoutLinks={false}
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
      ["5", "Blanco (Smit, G.)", "1", "1", "2"],
      ["", "Totaal", "19", "4", "23"],
    ]);
  },
};

export const NotAssignedSeats: StoryObj = {
  render: () => {
    return (
      <ApportionmentTable
        standings={gte19SeatsAndP7DrawingLots.seat_assignment.standings}
        politicalGroups={gte19SeatsAndP7DrawingLots.election.political_groups}
        fullSeats={gte19SeatsAndP7DrawingLots.seat_assignment.full_seats}
        residualSeats={gte19SeatsAndP7DrawingLots.seat_assignment.residual_seats}
        seats={gte19SeatsAndP7DrawingLots.seat_assignment.seats}
        notAssignedSeats={getNotAssignedSeats(gte19SeatsAndP7DrawingLots.state)}
        withoutLinks={true}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
      ["", "Nog niet toegewezen", "-", "3", "3"],
      ["1", "Partij voor de Stemmer", "9", "1", "10"],
      ["2", "Algemene Partij", "2", "-", "2"],
      ["3", "KEUS", "2", "-", "2"],
      ["4", "Algemene Lijst", "2", "-", "2"],
      ["5", "Unie van kandidaten", "2", "-", "2"],
      ["6", "Lijst van stemmers", "2", "-", "2"],
      ["", "Totaal", "19", "4", "23"],
    ]);
  },
};

export default {};
