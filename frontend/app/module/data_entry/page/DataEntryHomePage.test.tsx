import { waitForElementToBeRemoved } from "@testing-library/dom";
import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { overrideOnce, Providers, render, screen, setupTestRouter, waitFor, within } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider, ElectionStatusResponse } from "@kiesraad/api";
import { electionDetailsMockResponse } from "@kiesraad/api-mocks";

import { DataEntryHomePage } from "./DataEntryHomePage";

const renderDataEntryHomePage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <DataEntryHomePage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

describe("DataEntryHomePage", () => {
  beforeEach(() => {
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

    // Check if the navigation bar displays the correct information
    const nav = await screen.findByRole("navigation", { name: /primary-navigation/i });
    expect(within(nav).getByRole("link", { name: "Overzicht" })).toHaveAttribute("href", "/overview");
  });

  test("Finish input not visible when not finished", async () => {
    renderDataEntryHomePage();

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    );

    // Test that the message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
  });

  test("Finish input visible when finished", async () => {
    renderDataEntryHomePage();

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test("Rerender re-fetches election status", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "first_entry" },
        { id: 2, status: "first_entry" },
      ],
    } satisfies ElectionStatusResponse);

    // render and expect the initial status to be fetched
    const { rerender } = renderDataEntryHomePage();
    expect(await screen.findByText("Welk stembureau ga je invoeren?")).toBeVisible();
    expect(screen.queryByText("Alle stembureaus zijn ingevoerd")).not.toBeInTheDocument();

    // unmount DataEntryHomePage, but keep the providers as-is
    rerender(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <></>
        </ElectionStatusProvider>
      </ElectionProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText("Welk stembureau ga je invoeren?")).not.toBeInTheDocument();
    });

    // new status is that all polling stations are definitive, so the finish input message should be visible
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    } satisfies ElectionStatusResponse);

    // rerender DataEntryHomePage and expect the new status to be fetched
    rerender(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <DataEntryHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );
    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test("Data entry saved alert works", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter();
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
    await router.navigate({ hash: "data-entry-saved" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });
});
