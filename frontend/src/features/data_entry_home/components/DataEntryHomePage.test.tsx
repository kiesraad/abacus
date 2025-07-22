import { waitForElementToBeRemoved } from "@testing-library/dom";
import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { useUser } from "@/hooks/user/useUser";
import { electionDetailsMockResponse, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import { ElectionStatusResponse } from "@/types/generated/openapi";

import { dataEntryHomeRoutes } from "../routes";
import { DataEntryHomePage } from "./DataEntryHomePage";

vi.mock("@/hooks/user/useUser");

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
    vi.mocked(useUser).mockReturnValue(getTypistUser());
    server.use(ElectionListRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  });

  test("Error when committee session is not in the correct state", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId/data-entry/",
            children: dataEntryHomeRoutes,
          },
        ],
      },
    ]);

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await router.navigate("/elections/1/data-entry");

    rtlRender(<Providers router={router} />);

    await expectErrorPage();
  });

  test("Election name", async () => {
    renderDataEntryHomePage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();
  });

  test("Alert not visible when not finished", async () => {
    renderDataEntryHomePage();

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    // Test that the message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn ingevoerd")).not.toBeInTheDocument();
  });

  test("Alert visible when finished", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "definitive" },
        { polling_station_id: 2, status: "definitive" },
      ],
    });

    renderDataEntryHomePage();

    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test("Resume input visible when some are unfinished", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "first_entry_in_progress", first_entry_user_id: getTypistUser().user_id },
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
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/data-entry",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: dataEntryHomeRoutes,
      },
    ]);

    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    // Expect the alert to not be visible
    const alertHeading = "Je invoer is opgeslagen";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    // Set the hash to show the alert and expect it to be visible
    await router.navigate({ hash: "data-entry-1-saved" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Data entry different alert works", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/data-entry",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: dataEntryHomeRoutes,
      },
    ]);

    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    // Expect the alert to not be visible
    const alertHeading = "Let op: verschil met eerste invoer";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    // Set the hash to show the alert and expect it to be visible
    await router.navigate({ hash: "data-entry-different" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Data entry errors alert works", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/data-entry",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: dataEntryHomeRoutes,
      },
    ]);

    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    // Expect the alert to not be visible
    const alertHeading = "Let op: fouten in het proces-verbaal";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    // Set the hash to show the alert and expect it to be visible
    await router.navigate({ hash: "data-entry-errors" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Alert for entry already claimed is shown", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/data-entry",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: dataEntryHomeRoutes,
      },
    ]);

    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    const alertHeading = "Je kan stembureau 33 niet invoeren";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    await router.navigate({ hash: "data-entry-claimed-1" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Alert for entry already finalised is shown", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/data-entry",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: dataEntryHomeRoutes,
      },
    ]);
    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    const alertHeading = "Je kan stembureau 33 niet invoeren";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    await router.navigate({ hash: "data-entry-finalised-1" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Alert for invalid action is shown", async () => {
    const user = userEvent.setup();

    // Set up router and navigate to the data entry home page
    const router = setupTestRouter([
      {
        path: "/elections/:electionId/data-entry",
        Component: ElectionLayout,
        errorElement: <ErrorBoundary />,
        children: dataEntryHomeRoutes,
      },
    ]);
    await router.navigate("/elections/1/data-entry");
    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    const alertHeading = "Je kan stembureau 33 niet invoeren";
    expect(screen.queryByText(alertHeading)).not.toBeInTheDocument();

    await router.navigate({ hash: "invalid-action-1" });
    expect(await screen.findByRole("heading", { level: 2, name: alertHeading })).toBeVisible();

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(screen.getByRole("heading", { level: 2, name: alertHeading }));
    await user.click(screen.getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });
});
