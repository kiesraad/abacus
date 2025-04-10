import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@/api/gen/openapi";
import { render, screen } from "@/testing/test-utils";

import { election, largest_remainder_steps, seat_assignment } from "../../testing/less-than-19-seats";
import { LargestRemaindersTable } from "./LargestRemaindersTable";

describe("LargestRemaindersTable", () => {
  test("renders a table with the residual seat assignment with largest remainders method", async () => {
    render(
      <LargestRemaindersTable
        steps={largest_remainder_steps}
        finalStanding={seat_assignment.final_standing}
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
