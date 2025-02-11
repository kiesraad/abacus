import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { ElectionSummaryTable } from "./ElectionSummaryTable";

describe("ElectionSummaryTable", () => {
  test("renders a table with the election summary with number of voters", async () => {
    const { getByTestId } = render(
      <ElectionSummaryTable
        votes_counts={{
          votes_candidates_count: 100,
          blank_votes_count: 1,
          invalid_votes_count: 2,
          total_votes_cast_count: 103,
        }}
        seats={29}
        quota={{ integer: 3, numerator: 13, denominator: 29 }}
        number_of_voters={500}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kiesgerechtigden", "500", ""],
      ["Getelde stembiljetten", "103", "Opkomst: 20.60%"],
      ["Blanco stemmen", "1", "0.97%"],
      ["Ongeldige stemmen", "2", "1.94%"],
      ["Stemmen op kandidaten", "100", ""],
      ["Aantal raadszetels", "29", ""],
      ["Kiesdeler", "313/29", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "", "25% van de kiesdeler"],
    ]);

    // Fraction integer gets combined with numerator in string checks, so we separately check the quota fraction
    const quotaFraction = getByTestId("quota");
    expect(quotaFraction.childElementCount).toBe(2);
    expect(quotaFraction.children[0]).toHaveTextContent("3");
    expect(quotaFraction.children[1]).toHaveTextContent("13/29");
  });

  test("renders a table with the election summary without number of voters", async () => {
    const { getByTestId } = render(
      <ElectionSummaryTable
        votes_counts={{
          votes_candidates_count: 100,
          blank_votes_count: 1,
          invalid_votes_count: 2,
          total_votes_cast_count: 103,
        }}
        seats={29}
        quota={{ integer: 3, numerator: 13, denominator: 29 }}
        number_of_voters={undefined}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kiesgerechtigden", "", ""],
      ["Getelde stembiljetten", "103", ""],
      ["Blanco stemmen", "1", "0.97%"],
      ["Ongeldige stemmen", "2", "1.94%"],
      ["Stemmen op kandidaten", "100", ""],
      ["Aantal raadszetels", "29", ""],
      ["Kiesdeler", "313/29", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "", "25% van de kiesdeler"],
    ]);

    // Fraction integer gets combined with numerator in string checks, so we separately check the quota fraction
    const quotaFraction = getByTestId("quota");
    expect(quotaFraction.childElementCount).toBe(2);
    expect(quotaFraction.children[0]).toHaveTextContent("3");
    expect(quotaFraction.children[1]).toHaveTextContent("13/29");
  });
});
