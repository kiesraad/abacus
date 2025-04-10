import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@/api";
import { render, screen } from "@/testing/test-utils";

import { election, seat_assignment } from "../../testing/19-or-more-seats";
import { HighestAverageAssignmentStep } from "../../utils/seat-change";
import { HighestAveragesFor19OrMoreSeatsTable } from "./HighestAveragesFor19OrMoreSeatsTable";

describe("HighestAveragesFor19OrMoreSeatsTable", () => {
  test("renders a table with the residual seat assignment with highest averages method for 19 or more seats", async () => {
    render(
      <HighestAveragesFor19OrMoreSeatsTable
        steps={seat_assignment.steps as HighestAverageAssignmentStep[]}
        finalStanding={seat_assignment.final_standing}
        politicalGroups={election.political_groups as PoliticalGroup[]}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Restzetel 1", "Restzetel 2", "Restzetel 3", "Restzetel 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "", "50", "", "50", "", "46", "2/13", "1"],
      ["2", "Political Group B", "50", "2/6", "50", "2/6", "43", "1/7", "43", "1/7", "1"],
      ["3", "Political Group C", "49", "", "49", "", "49", "", "49", "", "0"],
      ["4", "Political Group D", "49", "1/2", "49", "1/2", "49", "1/2", "49", "1/2", "1"],
      ["5", "Political Group E", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);
  });
});
