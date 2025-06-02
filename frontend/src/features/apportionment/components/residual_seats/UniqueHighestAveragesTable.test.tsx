import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { election, highest_average_steps, seat_assignment } from "../../testing/lt-19-seats";
import { UniqueHighestAveragesTable } from "./UniqueHighestAveragesTable";

describe("UniqueHighestAveragesTable", () => {
  test("renders a table with the residual seat assignment with unique highest averages method", async () => {
    render(
      <UniqueHighestAveragesTable
        steps={highest_average_steps}
        finalStanding={seat_assignment.final_standing}
        politicalGroups={election.political_groups}
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
