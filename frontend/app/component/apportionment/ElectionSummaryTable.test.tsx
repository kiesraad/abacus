import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { ElectionSummaryTable } from "./ElectionSummaryTable";
import { apportionment, election, election_summary } from "./test-data/19-or-more-seats";

describe("ElectionSummaryTable", () => {
  test("renders a table with the election summary with number of voters", async () => {
    const { getByTestId } = render(
      <ElectionSummaryTable
        votes_counts={election_summary.votes_counts}
        seats={apportionment.seats}
        quota={apportionment.quota}
        number_of_voters={election.number_of_voters}
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
      ["Kiesdeler", "524/23", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "", "25% van de kiesdeler"],
    ]);

    // Fraction integer gets combined with numerator in string checks, so we separately check the quota fraction
    const quotaFraction = getByTestId("quota");
    expect(quotaFraction.childElementCount).toBe(2);
    expect(quotaFraction.children[0]).toHaveTextContent("52");
    expect(quotaFraction.children[1]).toHaveTextContent("4/23");
  });

  test("renders a table with the election summary without number of voters", async () => {
    const { getByTestId } = render(
      <ElectionSummaryTable
        votes_counts={election_summary.votes_counts}
        seats={apportionment.seats}
        quota={apportionment.quota}
        number_of_voters={undefined}
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
      ["Kiesdeler", "524/23", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "", "25% van de kiesdeler"],
    ]);

    // Fraction integer gets combined with numerator in string checks, so we separately check the quota fraction
    const quotaFraction = getByTestId("quota");
    expect(quotaFraction.childElementCount).toBe(2);
    expect(quotaFraction.children[0]).toHaveTextContent("52");
    expect(quotaFraction.children[1]).toHaveTextContent("4/23");
  });
});
