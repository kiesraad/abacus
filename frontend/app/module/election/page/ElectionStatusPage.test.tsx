import { beforeEach, describe, expect, test } from "vitest";

import { ElectionStatusPage } from "app/module/election";
import { overrideOnce, render, screen } from "app/test/unit";

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

  test("Finish input not visible when not finished", async () => {
    renderElectionStatusPage();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" }));

    // Test that the message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
  });

  test("Finish input visible when finished", async () => {
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
});
