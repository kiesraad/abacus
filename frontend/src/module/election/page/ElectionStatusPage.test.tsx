import { describe, expect, test } from "vitest";

import { ElectionStatusPage } from "@/module/election";

import { ElectionProvider, ElectionStatusProvider, ElectionStatusResponse } from "@kiesraad/api";
import { getElectionMockData } from "@kiesraad/api-mocks";
import { overrideOnce, render, screen } from "@kiesraad/test";

const renderElectionStatusPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <ElectionStatusPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

describe("ElectionStatusPage", () => {
  test("Finish input not visible when data entry is in progress", () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        {
          polling_station_id: 1,
          status: "first_entry_not_started",
        },
        {
          polling_station_id: 2,
          status: "first_entry_not_started",
        },
        {
          polling_station_id: 3,
          status: "first_entry_in_progress",
        },
        {
          polling_station_id: 4,
          status: "first_entry_in_progress",
        },
      ],
    } satisfies ElectionStatusResponse);

    renderElectionStatusPage();
    // Test that the data entry finished message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
  });

  test("Finish input visible when data entry has finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());

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
    expect(screen.getByRole("button", { name: "Invoerfase afronden" })).toBeVisible();
  });

  test("Finish input not visible when election is finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({ status: "DataEntryFinished" }));
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
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
  });
});
