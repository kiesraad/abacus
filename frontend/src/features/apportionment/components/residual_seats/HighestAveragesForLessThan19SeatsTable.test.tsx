import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@/api";
import { render, screen } from "@/testing";

import { election, highest_average_steps, seat_assignment } from "../../testing/less-than-19-seats";
import { HighestAveragesForLessThan19SeatsTable } from "./HighestAveragesForLessThan19SeatsTable";

describe("HighestAveragesForLessThan19SeatsTable", () => {
  test("renders a table with the residual seat assignment with highest averages method for less than 19 seats", async () => {
    render(
      <HighestAveragesForLessThan19SeatsTable
        steps={highest_average_steps}
        finalStanding={seat_assignment.final_standing}
        politicalGroups={election.political_groups as PoliticalGroup[]}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "10", "67", "4/12", "1"],
      ["2", "Political Group B", "0", "30", "", "0"],
      ["3", "Political Group C", "0", "58", "", "1"],
      ["4", "Political Group D", "0", "57", "", "1"],
      ["5", "Political Group E", "0", "56", "", "0"],
      ["6", "Political Group F", "0", "55", "", "0"],
      ["7", "Political Group G", "0", "54", "", "0"],
      ["8", "Political Group H", "0", "52", "", "0"],
    ]);
  });
});
