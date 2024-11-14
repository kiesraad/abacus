import { beforeEach, describe, expect, test } from "vitest";

import { ElectionStatusPage } from "app/module/election";
import { overrideOnce, render, screen, within } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { electionDetailsMockResponse, getElectionMockData } from "@kiesraad/api-mocks";

const renderElectionStatusPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <ElectionStatusPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

describe("ElectionStatusPage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  });

  test("Renders page correctly and does not show finish input", async () => {
    renderElectionStatusPage();

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        {
          id: 1,
          status: "not_started",
        },
        {
          id: 2,
          status: "not_started",
        },
        {
          id: 3,
          status: "first_entry_unfinished",
        },
        {
          id: 4,
          status: "first_entry_in_progress",
        },
      ],
    });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" }));

    const items = [...screen.getByTestId("polling-stations-per-status").children];
    expect(items[0]).toEqual(screen.getByRole("heading", { level: 3, name: "Stembureaus per status" }));
    expect(items[1]).toHaveTextContent("Niet afgeronde invoer (1)");
    expect(items[2]).toHaveTextContent("Invoer bezig (1)");
    expect(items[3]).toHaveTextContent("Eerste invoer klaar (0)");
    expect(items[4]).toHaveTextContent("Werkvoorraad (2)");

    const progress = [...screen.getByTestId("progress").children];
    expect(progress[0]).toEqual(screen.getByRole("heading", { level: 3, name: "Voortgang" }));
    expect(screen.getByTestId("progressbar-all")).toBeInTheDocument();
    const bars = [...screen.getByTestId("multi-outer-bar").children];
    const expectedData = [
      { percentage: 0, class: "definitive" },
      { percentage: 25, class: "in-progress" },
      { percentage: 25, class: "unfinished" },
      { percentage: 50, class: "not-started" },
    ];
    bars.forEach((bar, index) => {
      expect(bar.getAttribute("style")).toEqual(`width: ${expectedData[index]?.percentage}%;`);
      expect(bar.classList.contains(`${expectedData[index]?.class}`)).toBeTruthy();
    });

    const tablesRoot = screen.getByRole("article");
    expect(within(tablesRoot).getAllByRole("heading", { level: 3 }).length).toBe(3);
    expect(within(tablesRoot).getAllByRole("table").length).toBe(3);

    const tables = [...tablesRoot.children];

    expect(tables[0]).toContain(screen.getByRole("heading", { level: 3, name: "Niet afgeronde invoer (1)" }));
    const unfinishedTable = within(tables[0] as HTMLElement).getByTestId("unfinished");
    const unfinishedRows = within(unfinishedTable).getAllByRole("row");
    expect(unfinishedRows.length).toBe(2);
    expect(unfinishedRows[0]).toHaveTextContent(/Nummer/);
    expect(unfinishedRows[0]).toHaveTextContent(/Stembureau/);
    expect(unfinishedRows[1]).toHaveTextContent(/35/);
    expect(unfinishedRows[1]).toHaveTextContent(/Testschool/);
    expect(unfinishedRows[1]).toHaveTextContent(/1e invoer/);

    expect(tables[1]).toContain(screen.getByRole("heading", { level: 3, name: "Invoer bezig (1)" }));
    const inProgressTable = within(tables[1] as HTMLElement).getByTestId("in_progress");
    const inProgressRows = within(inProgressTable).getAllByRole("row");
    expect(inProgressRows.length).toBe(2);
    expect(inProgressRows[0]).toHaveTextContent(/Nummer/);
    expect(inProgressRows[0]).toHaveTextContent(/Stembureau/);
    expect(inProgressRows[1]).toHaveTextContent(/36/);
    expect(inProgressRows[1]).toHaveTextContent(/Testbuurthuis/);
    expect(inProgressRows[1]).toHaveTextContent(/1e invoer/);

    expect(tables[2]).toContain(screen.getByRole("heading", { level: 3, name: "Werkvoorraad (2)" }));
    const notStartedTable = within(tables[2] as HTMLElement).getByTestId("not_started");
    const notStartedRows = within(notStartedTable).getAllByRole("row");
    expect(notStartedRows.length).toBe(3);
    expect(notStartedRows[0]).toHaveTextContent(/Nummer/);
    expect(notStartedRows[0]).toHaveTextContent(/Stembureau/);
    expect(notStartedRows[1]).toHaveTextContent(/33/);
    expect(notStartedRows[1]).toHaveTextContent(/Op Rolletjes/);
    expect(notStartedRows[2]).toHaveTextContent(/34/);
    expect(notStartedRows[2]).toHaveTextContent(/Testplek/);

    // Test that the data entry finished message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
  });

  test("Finish input visible when data entry has finished", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    renderElectionStatusPage();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" }));

    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
  });

  test("Finish input not visible when election is finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(5));
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    renderElectionStatusPage();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" }));

    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
  });

  test("No polling stations text visible instead of tables", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(3));

    renderElectionStatusPage();

    expect(await screen.findByText("Er zijn nog geen stembureaus toegevoegd voor deze verkiezing.")).toBeVisible();
  });
});
