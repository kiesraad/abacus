import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { election, seat_assignment } from "../../testing/gte-19-seats";
import { FullSeatsTable } from "./FullSeatsTable";

describe("FullSeatsTable", () => {
  test("renders a table with the full seats assignment", async () => {
    render(
      <FullSeatsTable
        finalStanding={seat_assignment.final_standing}
        politicalGroups={election.political_groups}
        quota={seat_assignment.quota}
        resultChanges={[]}
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
