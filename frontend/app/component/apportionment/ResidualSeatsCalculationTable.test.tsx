import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";
import { apportionment } from "./test-data/19-or-more-seats";

describe("ResidualSeatsCalculationTable", () => {
  test("renders a table with the residual seats calculation", async () => {
    render(
      <ResidualSeatsCalculationTable
        seats={apportionment.seats}
        wholeSeats={apportionment.whole_seats}
        residualSeats={apportionment.residual_seats}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Totaal aantal zetels", "23", ""],
      ["Totaal aantal toegewezen volle zetels", "19", "— (min)"],
      ["Restzetels", "4", ""],
    ]);
  });
});
