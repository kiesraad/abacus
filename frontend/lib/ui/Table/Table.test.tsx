import { within } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { render, renderReturningRouter, screen } from "@kiesraad/test";

import { BasicTable, IconBadgeTable, LinkTable, StyledTable, TotalTableWithFractions } from "./Table.stories";

describe("Table", () => {
  test("BasicTable renders", async () => {
    render(<BasicTable />);

    const table = await screen.findByTestId("basic_table");
    expect(table).toHaveTableContent([
      ["Number", "Fixed width", "Some value"],
      ["1", "some", "value"],
      ["2", "other", "value"],
      ["3", "another", "thing"],
    ]);
  });

  test("StyledTable renders", async () => {
    render(<StyledTable />);

    const table = await screen.findByTestId("styled_table");
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["33", "Op rolletjes 1e invoer"],
      ["34", "Testplek 1e invoer"],
    ]);
  });

  test("LinkTable renders and LinkRow navigates to url when clicked", async () => {
    const user = userEvent.setup();

    const router = renderReturningRouter(<LinkTable />);

    const table = await screen.findByTestId("link_table");
    expect(table).toHaveTableContent([
      ["Number", "Click me", "Look a chevron right of here"],
      ["1", "some", "value"],
      ["2", "other", "value"],
      ["3", "another", "thing"],
    ]);

    const rows = within(table).getAllByRole("row");

    if (rows[1]) {
      await user.click(rows[1]);
    }

    expect(router.state.location.hash).toEqual("#row1");
  });

  test("TotalTable with fractions renders", async () => {
    render(<TotalTableWithFractions />);

    const table = await screen.findByTestId("total_table_with_fractions");
    expect(table).toHaveTableContent([
      ["Number", "List name", "Fractions", "Seats"],
      ["1", "Political Group A", "3", "149/150", "15"],
      ["2", "Political Group B", "5", "", "11"],
      ["3", "Political Group C", "8", "1/150", "4"],
      ["", "", "Total", "30"],
    ]);
  });

  test("IconBadgeTable renders", async () => {
    render(<IconBadgeTable />);

    const table = await screen.findByTestId("icon_badge_table");
    expect(table).toHaveTableContent([
      ["Number", "With icon", "With badge"],
      ["1", "some", "value 1e invoer"],
      ["2", "other", "value 1e invoer"],
      ["3", "another", "thing 1e invoer"],
    ]);
  });
});
