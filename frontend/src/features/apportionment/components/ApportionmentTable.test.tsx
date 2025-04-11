import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@/api/gen/openapi";
import { render, screen } from "@/testing/test-utils";

import { election, seat_assignment } from "../testing/gte-19-seats";
import { ApportionmentTable } from "./ApportionmentTable";

describe("ApportionmentTable", () => {
  test("renders a table with the apportionment", async () => {
    render(
      <ApportionmentTable
        finalStanding={seat_assignment.final_standing}
        politicalGroups={election.political_groups as PoliticalGroup[]}
        fullSeats={seat_assignment.full_seats}
        residualSeats={seat_assignment.residual_seats}
        seats={seat_assignment.seats}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
      ["1", "Political Group A", "11", "1", "12"],
      ["2", "Political Group B", "5", "1", "6"],
      ["3", "Political Group C", "1", "-", "1"],
      ["4", "Political Group D", "1", "1", "2"],
      ["5", "Political Group E", "1", "1", "2"],
      ["", "Totaal", "19", "4", "23"],
    ]);
  });
});
