import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { overrideOnce, render, screen, server, within } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { electionDetailsMockResponse } from "@kiesraad/api-mocks";

import { InputHomePage } from "./InputHomePage";

describe("InputHomePage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <InputHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  test("Election name", async () => {
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    );

    // Check if the navigation bar displays the correct information
    const nav = await screen.findByRole("navigation", { name: /primary-navigation/i });
    expect(within(nav).getByRole("link", { name: "Overzicht" })).toHaveAttribute(
      "href",
      "/overview",
    );
  });

  test("Finish input not visible when not finished", async () => {
    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    );

    // Test that the message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).toBeNull();
  });

  test("Finish input visible when finished", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "Complete" },
        { id: 2, status: "Complete" },
      ],
    });

    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
  });
});
