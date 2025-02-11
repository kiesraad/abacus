import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { RestSeatsCalculationTable } from "./RestSeatsCalculationTable";

describe("RestSeatsCalculationTable", () => {
  test("renders a table with the rest seats calculation", async () => {
    render(<RestSeatsCalculationTable whole_seats={28} rest_seats={1} seats={29} />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Totaal aantal zetels", "29", ""],
      ["Totaal aantal toegewezen volle zetels", "28", "— min"],
      ["Restzetels", "1", ""],
    ]);
  });
});
