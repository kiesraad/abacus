import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as gte19Seats from "../testing/gte-19-seats";
import { ElectionSummaryTable } from "./ElectionSummaryTable";

export const DefaultWithNumberOfVoters: StoryObj = {
  render: () => {
    return (
      <ElectionSummaryTable
        votesCounts={gte19Seats.election_summary.votes_counts}
        seats={gte19Seats.seat_assignment.seats}
        quota={gte19Seats.seat_assignment.quota}
        numberOfVoters={gte19Seats.election.number_of_voters}
        preferenceThreshold={gte19Seats.candidate_nomination.preference_threshold}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kiesgerechtigden", "2.000", ""],
      ["Getelde stembiljetten", "1.205", "Opkomst: 60.25%"],
      ["Blanco stemmen", "2", "0.17%"],
      ["Ongeldige stemmen", "3", "0.25%"],
      ["Totaal stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "23", ""],
      ["Kiesdeler", "52 4/23", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "13 100/2300", "25% van de kiesdeler"],
    ]);
  },
};

export const DefaultWithoutNumberOfVoters: StoryObj = {
  render: () => {
    return (
      <ElectionSummaryTable
        votesCounts={gte19Seats.election_summary.votes_counts}
        seats={gte19Seats.seat_assignment.seats}
        quota={gte19Seats.seat_assignment.quota}
        numberOfVoters={undefined}
        preferenceThreshold={gte19Seats.candidate_nomination.preference_threshold}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kiesgerechtigden", "", ""],
      ["Getelde stembiljetten", "1.205", ""],
      ["Blanco stemmen", "2", "0.17%"],
      ["Ongeldige stemmen", "3", "0.25%"],
      ["Totaal stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "23", ""],
      ["Kiesdeler", "52 4/23", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "13 100/2300", "25% van de kiesdeler"],
    ]);
  },
};

export default {};
