import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { election, seat_assignment } from "../../testing/gte-19-seats";
import { HighestAverageAssignmentStep } from "../../utils/seat-change";
import { HighestAveragesTable } from "./HighestAveragesTable";

describe("HighestAveragesTable", () => {
  test("renders a table with the residual seat assignment with highest averages method", async () => {
    render(
      <HighestAveragesTable
        steps={seat_assignment.steps as HighestAverageAssignmentStep[]}
        finalStanding={seat_assignment.final_standing}
        politicalGroups={election.political_groups}
        resultChanges={[]}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "", "50", "", "50", "", "46", "2/13", "1"],
      ["2", "Political Group B", "50", "2/6", "50", "2/6", "43", "1/7", "43", "1/7", "1"],
      ["3", "Political Group C", "49", "", "49", "", "49", "", "49", "", "0"],
      ["4", "Political Group D", "49", "1/2", "49", "1/2", "49", "1/2", "49", "1/2", "1"],
      ["5", "Political Group E", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);
  });
});
