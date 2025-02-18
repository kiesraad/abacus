import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@kiesraad/api";
import { render, screen } from "@kiesraad/test";

import { LargestSurplusesTable } from "./LargestSurplusesTable";
import { apportionment, election, highest_surplus_steps } from "./test-data/less-than-19-seats";

describe("LargestSurplusesTable", () => {
  test("renders a table with the residual seat allocation with largest surpluses system", async () => {
    render(
      <LargestSurplusesTable
        highestSurplusSteps={highest_surplus_steps}
        finalStanding={apportionment.final_standing}
        politicalGroups={election.political_groups as PoliticalGroup[]}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);
  });
});
