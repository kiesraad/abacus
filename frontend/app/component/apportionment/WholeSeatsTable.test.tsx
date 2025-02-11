import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { WholeSeatsTable } from "./WholeSeatsTable";

describe("WholeSeatsTable", () => {
  test("renders a table with the whole seats assignment", async () => {
    const { getByTestId } = render(
      <WholeSeatsTable
        final_standing={[
          {
            pg_number: 1,
            votes_cast: 66,
            surplus_votes: {
              integer: 0,
              numerator: 14,
              denominator: 29,
            },
            meets_surplus_threshold: true,
            whole_seats: 19,
            rest_seats: 0,
            total_seats: 19,
          },
          {
            pg_number: 2,
            votes_cast: 34,
            surplus_votes: {
              integer: 2,
              numerator: 28,
              denominator: 29,
            },
            meets_surplus_threshold: true,
            whole_seats: 9,
            rest_seats: 1,
            total_seats: 10,
          },
        ]}
        quota={{ integer: 3, numerator: 13, denominator: 29 }}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "66", ":", "313/29", "=", "19"],
      ["2", "34", ":", "313/29", "=", "9"],
    ]);

    // Fraction integer gets combined with numerator in string checks, so we separately check the quota fraction
    const quotaFraction = getByTestId("1-quota");
    expect(quotaFraction.childElementCount).toBe(2);
    expect(quotaFraction.children[0]).toHaveTextContent("3");
    expect(quotaFraction.children[1]).toHaveTextContent("13/29");
  });
});
