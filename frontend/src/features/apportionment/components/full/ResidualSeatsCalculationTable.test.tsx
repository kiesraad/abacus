import { describe, expect, test } from "vitest";

import { apportionment } from "@/features/apportionment/testing/19-or-more-seats";
import { render, screen } from "@/testing";

import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";

describe("ResidualSeatsCalculationTable", () => {
  test("renders a table with the residual seats calculation", async () => {
    render(
      <ResidualSeatsCalculationTable
        seats={apportionment.seats}
        fullSeats={apportionment.full_seats}
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
