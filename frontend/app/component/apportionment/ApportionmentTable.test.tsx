import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@kiesraad/api";
import { render, screen } from "@kiesraad/test";

import { ApportionmentTable } from "./ApportionmentTable";
import { apportionment, election } from "./test-data/19-or-more-seats";

describe("ApportionmentTable", () => {
  test("renders a table with the apportionment", async () => {
    render(
      <ApportionmentTable
        final_standing={apportionment.final_standing}
        political_groups={election.political_groups as PoliticalGroup[]}
        whole_seats={apportionment.whole_seats}
        residual_seats={apportionment.residual_seats}
        seats={apportionment.seats}
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
