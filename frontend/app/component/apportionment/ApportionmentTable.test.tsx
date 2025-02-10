import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { ApportionmentTable } from "./ApportionmentTable";

describe("ApportionmentTable", () => {
  test("renders a table with the apportionment", async () => {
    render(
      <ApportionmentTable
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
        political_groups={[
          {
            number: 1,
            name: "Political Group A",
            candidates: [
              {
                number: 1,
                initials: "A.",
                first_name: "Alice",
                last_name: "Foo",
                locality: "Amsterdam",
                gender: "Female",
              },
              {
                number: 2,
                initials: "C.",
                first_name: "Charlie",
                last_name: "Doe",
                locality: "Rotterdam",
              },
            ],
          },
          {
            number: 2,
            name: "Political Group B",
            candidates: [
              {
                number: 1,
                initials: "A.",
                first_name: "Alice",
                last_name: "Foo",
                locality: "Amsterdam",
                gender: "Female",
              },
              {
                number: 2,
                initials: "C.",
                first_name: "Charlie",
                last_name: "Doe",
                locality: "Rotterdam",
              },
            ],
          },
        ]}
        whole_seats={28}
        rest_seats={1}
        seats={29}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels", ""],
      ["1", "Political Group A", "19", "-", "19", ""],
      ["2", "Political Group B", "9", "1", "10", ""],
      ["", "Totaal", "28", "1", "29", ""],
    ]);
  });
});
