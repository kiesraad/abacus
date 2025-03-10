import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@kiesraad/api";
import { render, screen } from "@kiesraad/test";

import { LargestRemaindersTable } from "./LargestRemaindersTable";
import { apportionment, election, largest_remainder_steps } from "./test-data/less-than-19-seats";

describe("LargestRemaindersTable", () => {
  test("renders a table with the residual seat allocation with largest remainders system", async () => {
    render(
      <LargestRemaindersTable
        largestRemainderSteps={largest_remainder_steps}
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
