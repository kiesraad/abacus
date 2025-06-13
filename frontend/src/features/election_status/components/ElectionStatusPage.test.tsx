import { waitForElementToBeRemoved } from "@testing-library/dom";
import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, setupTestRouter } from "@/testing/test-utils";

import { electionStatusRoutes } from "../routes";
import { ElectionStatusPage } from "./ElectionStatusPage";

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
    server.use(
      ElectionListRequestHandler,
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      UserListRequestHandler,
    );
  });

  test("Finish input not visible when data entry is in progress", () => {
    renderElectionStatusPage();

    // Test that the data entry finished message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();

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
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();

    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
  });

  test("Data entry kept alert works", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the election data entry status page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/status",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: electionStatusRoutes,
      },
    ]);

    await router.navigate("/elections/1/status");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();

    // Expect the alert to not be visible
    const alertHeading = "Verschil opgelost voor stembureau 33";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    // Set the hash to show the alert and expect it to be visible
    await router.navigate({ hash: "data-entry-kept-1" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Both data entries discarded alert works", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the election data entry status page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/status",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: electionStatusRoutes,
      },
    ]);

    await router.navigate("/elections/1/status");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();

    // Expect the alert to not be visible
    const alertHeading = "Verschil opgelost voor stembureau 33";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    // Set the hash to show the alert and expect it to be visible
    await router.navigate({ hash: "data-entries-discarded-1" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });
});
