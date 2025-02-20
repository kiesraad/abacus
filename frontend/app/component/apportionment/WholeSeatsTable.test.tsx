import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { apportionment, election } from "./test-data/19-or-more-seats";
import { WholeSeatsTable } from "./WholeSeatsTable";

describe("WholeSeatsTable", () => {
  test("renders a table with the whole seats assignment", async () => {
    render(
      <WholeSeatsTable
        finalStanding={apportionment.final_standing}
        politicalGroups={election.political_groups!}
        quota={apportionment.quota}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "Political Group A", "600", ":", "52", "4/23", "=", "11"],
      ["2", "Political Group B", "302", ":", "52", "4/23", "=", "5"],
      ["3", "Political Group C", "98", ":", "52", "4/23", "=", "1"],
      ["4", "Political Group D", "99", ":", "52", "4/23", "=", "1"],
      ["5", "Political Group E", "101", ":", "52", "4/23", "=", "1"],
    ]);
  });
});
