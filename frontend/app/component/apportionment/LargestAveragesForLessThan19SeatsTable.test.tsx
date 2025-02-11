import { describe, expect, test } from "vitest";

import { PoliticalGroup } from "@kiesraad/api";
import { render, screen } from "@kiesraad/test";

import { LargestAveragesForLessThan19SeatsTable } from "./LargestAveragesForLessThan19SeatsTable";
import { election, final_standing, highest_average_steps } from "./test-data/less-than-19-seats";

describe("LargestAveragesForLessThan19SeatsTable", () => {
  test("renders a table with the rest seat allocation with largest averages system for less than 19 seats", async () => {
    const { getByTestId } = render(
      <LargestAveragesForLessThan19SeatsTable
        highest_average_steps={highest_average_steps}
        final_standing={final_standing}
        political_groups={election.political_groups as PoliticalGroup[]}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "10", "674/12", "1"],
      ["2", "Political Group B", "0", "30", "0"],
      ["3", "Political Group C", "0", "58", "1"],
      ["4", "Political Group D", "0", "57", "1"],
      ["5", "Political Group E", "0", "56", "0"],
      ["6", "Political Group F", "0", "55", "0"],
      ["7", "Political Group G", "0", "54", "0"],
      ["8", "Political Group H", "0", "52", "0"],
    ]);

    // Fraction integer gets combined with numerator in string checks, so we separately check the quota fraction
    const quotaFraction = getByTestId("1-average");
    expect(quotaFraction.childElementCount).toBe(2);
    expect(quotaFraction.children[0]).toHaveTextContent("67");
    expect(quotaFraction.children[1]).toHaveTextContent("4/12");
  });
});
