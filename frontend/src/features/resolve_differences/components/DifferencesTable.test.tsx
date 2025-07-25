import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";
import { ResolveDifferencesAction } from "@/types/generated/openapi";

import { DifferencesRow, DifferencesTable } from "./DifferencesTable";
import cls from "./ResolveDifferences.module.css";

const tableHeaders = ["Code", "First", "Second", "Description"];

function renderTable(rows: DifferencesRow[], action: ResolveDifferencesAction | undefined = undefined) {
  render(<DifferencesTable title={"Differences"} headers={tableHeaders} rows={rows} action={action} />);
}

describe("DifferencesTable", () => {
  test("Render nothing when there are no differences", () => {
    renderTable([
      { first: "10", second: "10" },
      { first: "20", second: "20" },
    ]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("Render rows that have differences", async () => {
    renderTable([
      { code: "A", first: "10", second: "20", description: "Some value" },
      { code: "B", first: "30", second: "30", description: "Another value" },
    ]);
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([tableHeaders, ["A", "10", "20", "Some value"]]);
  });

  test("Falsy values are considered equal", async () => {
    renderTable([
      { code: "A", first: "A", second: undefined, description: "Truthy string" },
      { code: "B", first: "1", second: undefined, description: "Truthy number" },
      { code: "A.1", first: "", second: undefined, description: "Falsy string" },
      { code: "B.1", first: "0", second: undefined, description: "Falsy number" },
      { code: "C", first: "", second: "0", description: "Falsy string and number" },
      { code: "D", first: undefined, second: undefined, description: "Undefined" },
    ]);
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([
      tableHeaders,
      ["A", "A", "\u2014", "Truthy string"],
      ["B", "1", "\u2014", "Truthy number"],
    ]);
  });

  test("Render an mdash as the zero value", async () => {
    renderTable([{ code: "A", first: "10", second: "0", description: "Some value" }]);
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([tableHeaders, ["A", "10", "\u2014", "Some value"]]);
  });

  test("Render a string value as-is", async () => {
    renderTable([{ code: "A", first: "Ja", second: "Nee", description: "Some value" }]);
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([tableHeaders, ["A", "Ja", "Nee", "Some value"]]);
  });

  test("Render a big number with thousands separator", async () => {
    renderTable([{ code: "A", first: "10120334", second: "9344042", description: "Some value" }]);
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([tableHeaders, ["A", "10.120.334", "9.344.042", "Some value"]]);
  });

  test("Render gap rows between rows with differences", async () => {
    renderTable([
      { code: "A", first: "10", second: "10", description: "Same" },
      { code: "B", first: "20", second: "20", description: "Same" },
      { code: "C", first: "30", second: "33", description: "But different" },
      { code: "D", first: "40", second: "40", description: "Same" },
      { code: "E", first: "50", second: "55", description: "Other" },
      { code: "F", first: "60", second: "60", description: "Same" },
      { code: "G", first: "70", second: "70", description: "Same" },
      { code: "H", first: "80", second: "88", description: "Skip two" },
      { code: "I", first: "90", second: "90", description: "Same" },
    ]);
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTableContent([
      tableHeaders,
      ["C", "30", "33", "But different"],
      [""],
      ["E", "50", "55", "Other"],
      [""],
      ["H", "80", "88", "Skip two"],
    ]);
  });

  describe("show result of action in differences tables", () => {
    const rows = [{ first: "10", second: "11" }];

    test("keep_first_entry", async () => {
      renderTable(rows, "keep_first_entry");
      const [first, second] = await screen.findAllByRole("cell");

      expect(first).toHaveClass(cls.keep!);
      expect(first).not.toHaveClass(cls.discard!);
      expect(second).toHaveClass(cls.discard!);
      expect(second).not.toHaveClass(cls.keep!);
    });

    test("keep_second_entry", async () => {
      renderTable(rows, "keep_second_entry");
      const [first, second] = await screen.findAllByRole("cell");

      expect(first).toHaveClass(cls.discard!);
      expect(first).not.toHaveClass(cls.keep!);
      expect(second).toHaveClass(cls.keep!);
      expect(second).not.toHaveClass(cls.discard!);
    });

    test("discard_both_entries", async () => {
      renderTable(rows, "discard_both_entries");
      const [first, second] = await screen.findAllByRole("cell");

      expect(first).toHaveClass(cls.discard!);
      expect(first).not.toHaveClass(cls.keep!);
      expect(second).toHaveClass(cls.discard!);
      expect(second).not.toHaveClass(cls.keep!);
    });

    test("no action chosen", async () => {
      renderTable(rows, undefined);
      const [first, second] = await screen.findAllByRole("cell");

      expect(first).not.toHaveClass(cls.keep!);
      expect(first).not.toHaveClass(cls.discard!);
      expect(second).not.toHaveClass(cls.discard!);
      expect(second).not.toHaveClass(cls.keep!);
    });
  });
});
