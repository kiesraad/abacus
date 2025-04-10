import { waitForElementToBeRemoved } from "@testing-library/dom";
import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionStatusProvider } from "@/api/election/ElectionStatusProvider";
// eslint-disable-next-line import/no-restricted-paths -- #1283
import { routes } from "@/app/routes";
import { electionDetailsMockResponse } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, setupTestRouter, within } from "@/testing/test-utils";

import { ElectionStatusResponse, LoginResponse, useUser } from "@kiesraad/api";

import { DataEntryChoicePage } from "./DataEntryChoicePage";

vi.mock("@/api/useUser");

const testUser: LoginResponse = {
  username: "test-user-1",
  user_id: 1,
  role: "typist",
  needs_password_change: false,
};

const renderDataEntryHomePage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <DataEntryChoicePage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

describe("DataEntryHomePage", () => {
  beforeEach(() => {
    (useUser as Mock).mockReturnValue(testUser satisfies LoginResponse);
    server.use(ElectionListRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  });

  test("Election name", async () => {
    renderDataEntryHomePage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    );
  });

  test("Alert not visible when not finished", async () => {
    renderDataEntryHomePage();

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    );

    // Test that the message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn ingevoerd")).not.toBeInTheDocument();
  });

  test("Alert visible when finished", async () => {
    renderDataEntryHomePage();

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "definitive" },
        { polling_station_id: 2, status: "definitive" },
      ],
    });

    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test("Resume input visible when some are unfinished", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "first_entry_in_progress", first_entry_user_id: testUser.user_id },
        { polling_station_id: 2, status: "first_entry_not_started" },
      ],
    } satisfies ElectionStatusResponse);
    renderDataEntryHomePage();
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Je hebt nog een openstaande invoer")).toBeVisible();
    expect(within(alert).getByText("Op Rolletjes")).toBeVisible();
    expect(within(alert).queryByText("Testplek")).toBeNull();
  });

  test("Resume input invisible when none are unfinished", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "first_entry_not_started" },
        { polling_station_id: 2, status: "definitive" },
      ],
    });
    renderDataEntryHomePage();
    // Ensure the page is rendered before testing
    await screen.findByText("Gemeenteraadsverkiezingen 2026");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("Data entry saved alert works", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter(routes);
    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    );

    // Expect the alert to not be visible
    const alertHeading = "Je invoer is opgeslagen";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    // Set the hash to show the alert and expect it to be visible
    await router.navigate({ hash: "data-entry-saved-1" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });
});
