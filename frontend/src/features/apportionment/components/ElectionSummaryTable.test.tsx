import { describe, expect, test } from "vitest";

import { apportionment, election, election_summary } from "@/features/apportionment/testing/19-or-more-seats";
import { render, screen } from "@/testing";

import { ElectionSummaryTable } from "./ElectionSummaryTable";

describe("ElectionSummaryTable", () => {
  test("renders a table with the election summary with number of voters", async () => {
    render(
      <ElectionSummaryTable
        votesCounts={election_summary.votes_counts}
        seats={apportionment.seats}
        quota={apportionment.quota}
        numberOfVoters={election.number_of_voters}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kiesgerechtigden", "2.000", ""],
      ["Getelde stembiljetten", "1.205", "Opkomst: 60.25%"],
      ["Blanco stemmen", "3", "0.25%"],
      ["Ongeldige stemmen", "2", "0.17%"],
      ["Stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "23", ""],
      ["Kiesdeler", "52 4/23", "Benodigde stemmen per volle zetel"],
    ]);
  });

  test("renders a table with the election summary without number of voters", async () => {
    render(
      <ElectionSummaryTable
        votesCounts={election_summary.votes_counts}
        seats={apportionment.seats}
        quota={apportionment.quota}
        numberOfVoters={undefined}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kiesgerechtigden", "", ""],
      ["Getelde stembiljetten", "1.205", ""],
      ["Blanco stemmen", "3", "0.25%"],
      ["Ongeldige stemmen", "2", "0.17%"],
      ["Stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "23", ""],
      ["Kiesdeler", "52 4/23", "Benodigde stemmen per volle zetel"],
    ]);
  });
});
