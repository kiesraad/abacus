import { within } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { renderReturningRouter, screen } from "@/testing/test-utils";

import { Table } from "./Table";

describe("Table", () => {
  test("Row with link navigates to url when clicked", async () => {
    const user = userEvent.setup();

    const data: [number, string][] = [
      [1, "some"],
      [2, "other"],
    ];

    const router = renderReturningRouter(
      <Table id="link_table">
        <Table.Header>
          <Table.HeaderCell>Number</Table.HeaderCell>
          <Table.HeaderCell>Click me</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {data.map((row) => (
            <Table.Row key={row[0]} to={`#row${row[0]}`}>
              <Table.NumberCell>{row[0]}</Table.NumberCell>
              <Table.Cell>{row[1]}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>,
    );

    const table = await screen.findByTestId("link_table");
    const rows = within(table).getAllByRole("row");
    await user.click(rows[1]!);
    expect(router.state.location.hash).toEqual("#row1");
  });
});
