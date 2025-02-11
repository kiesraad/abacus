import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { RestSeatsCalculationTable } from "./RestSeatsCalculationTable";
import { apportionment } from "./test-data/19-or-more-seats";

describe("RestSeatsCalculationTable", () => {
  test("renders a table with the rest seats calculation", async () => {
    render(
      <RestSeatsCalculationTable
        whole_seats={apportionment.whole_seats}
        rest_seats={apportionment.rest_seats}
        seats={apportionment.seats}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Totaal aantal zetels", "23", ""],
      ["Totaal aantal toegewezen volle zetels", "19", "— min"],
      ["Restzetels", "4", ""],
    ]);
  });
});
