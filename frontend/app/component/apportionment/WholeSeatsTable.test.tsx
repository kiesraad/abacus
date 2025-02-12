import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { apportionment } from "./test-data/19-or-more-seats";
import { WholeSeatsTable } from "./WholeSeatsTable";

describe("WholeSeatsTable", () => {
  test("renders a table with the whole seats assignment", async () => {
    render(<WholeSeatsTable final_standing={apportionment.final_standing} quota={apportionment.quota} />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "600", ":", "52 4/23", "=", "11"],
      ["2", "302", ":", "52 4/23", "=", "5"],
      ["3", "98", ":", "52 4/23", "=", "1"],
      ["4", "99", ":", "52 4/23", "=", "1"],
      ["5", "101", ":", "52 4/23", "=", "1"],
    ]);
  });
});
