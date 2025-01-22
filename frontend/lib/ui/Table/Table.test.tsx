import { within } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { render, renderReturningRouter, screen } from "@kiesraad/test";

import { BasicTable, LinkTable } from "./Table.stories";

describe("Table", () => {
  test("BasicTable renders", async () => {
    render(<BasicTable />);

    const table = await screen.findByTestId("basic_table");
    const rows = within(table).getAllByRole("row");

    expect(rows.length).toBe(4);

    expect(rows[0]).toHaveTextContent(/Number/);
    expect(rows[0]).toHaveTextContent(/Fixed width/);
    expect(rows[0]).toHaveTextContent(/Some value/);

    expect(rows[1]).toHaveTextContent(/1/);
    expect(rows[1]).toHaveTextContent(/some/);
    expect(rows[1]).toHaveTextContent(/value/);
  });

  test("LinkRow navigates to url when clicked", async () => {
    const user = userEvent.setup();

    const router = renderReturningRouter(<LinkTable />);

    const table = await screen.findByTestId("link_table");
    const rows = within(table).getAllByRole("row");

    if (rows[1]) {
      await user.click(rows[1]);
    }

    expect(router.state.location.hash).toEqual("#row1");
  });
});
