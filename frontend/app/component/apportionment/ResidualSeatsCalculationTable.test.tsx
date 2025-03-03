import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";
import { seat_assignment } from "./test-data/19-or-more-seats";

describe("ResidualSeatsCalculationTable", () => {
  test("renders a table with the residual seats calculation", async () => {
    render(
      <ResidualSeatsCalculationTable
        seats={seat_assignment.seats}
        fullSeats={seat_assignment.full_seats}
        residualSeats={seat_assignment.residual_seats}
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
