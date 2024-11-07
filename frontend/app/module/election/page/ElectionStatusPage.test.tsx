import { beforeEach, describe, expect, test } from "vitest";

import { ElectionStatusPage } from "app/module/election";
import { overrideOnce, render, screen } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { electionDetailsMockResponse } from "@kiesraad/api-mocks";

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
    renderElectionStatusPage();

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
  });

  test("Renders a multi progress bar", async () => {
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
          status: "definitive",
        },
        {
          id: 4,
          status: "first_entry_in_progress",
        },
      ],
    });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" }));

    const items = [...screen.getByTestId("shortcuts").children];
    expect(items[0]).toHaveTextContent("Snelkoppelingen");
    expect(items[1]).toHaveTextContent("Niet afgeronde invoer (0)");
    expect(items[2]).toHaveTextContent("Invoer bezig (1)");
    expect(items[3]).toHaveTextContent("Eerste invoer klaar (1)");
    expect(items[4]).toHaveTextContent("Werkvoorraad (2)");

    expect(screen.getByTestId("progressbar-all")).toBeInTheDocument();
    const bars = [...screen.getByTestId("multi-outer-bar").children];
    const expectedData = [
      { percentage: 25, class: "definitive" },
      { percentage: 25, class: "in-progress" },
      { percentage: 0, class: "unfinished" },
      { percentage: 50, class: "not-started" },
    ];
    bars.forEach((bar, index) => {
      expect(bar.getAttribute("style")).toEqual(`width: ${expectedData[index]?.percentage}%;`);
      expect(bar.classList.contains(`${expectedData[index]?.class}`)).toBeTruthy();
    });
  });
});
