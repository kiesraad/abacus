import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing";

import { seat_assignment } from "../../testing/19-or-more-seats";
import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";

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
