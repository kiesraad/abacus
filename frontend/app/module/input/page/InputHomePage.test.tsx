import { describe, expect, test } from "vitest";

import { overrideOnce, render, screen } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { electionDetailsMockResponse } from "@kiesraad/api-mocks";

import { InputHomePage } from "./InputHomePage";

describe("InputHomePage", () => {
  overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  test("Election name", async () => {
    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <InputHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    expect(await screen.findByText(electionDetailsMockResponse.election.name)).toBeVisible();
  });

  test("Finish input not visible when not finished", async () => {
    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <InputHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    // Wait for the page to be loaded
    await screen.findByText("Gemeenteraadsverkiezingen 2026");

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

    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <InputHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
  });
});
