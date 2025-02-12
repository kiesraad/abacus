import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@kiesraad/api";
import { render, screen } from "@kiesraad/test";

import { LargestAveragesFor19OrMoreSeatsTable } from "./LargestAveragesFor19OrMoreSeatsTable";
import { apportionment, election } from "./test-data/19-or-more-seats";

describe("LargestAveragesFor19OrMoreSeatsTable", () => {
  test("renders a table with the rest seat allocation with largest averages system for 19 or more seats", async () => {
    render(
      <LargestAveragesFor19OrMoreSeatsTable
        highest_average_steps={apportionment.steps}
        final_standing={apportionment.final_standing}
        political_groups={election.political_groups as PoliticalGroup[]}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Restzetel 1", "Restzetel 2", "Restzetel 3", "Restzetel 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "50", "50", "46 2/13", "1"],
      ["2", "Political Group B", "50 2/6", "50 2/6", "43 1/7", "43 1/7", "1"],
      ["3", "Political Group C", "49", "49", "49", "49", "0"],
      ["4", "Political Group D", "49 1/2", "49 1/2", "49 1/2", "49 1/2", "1"],
      ["5", "Political Group E", "50 1/2", "33 2/3", "33 2/3", "33 2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);
  });
});
