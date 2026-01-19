import { waitForElementToBeRemoved } from "@testing-library/dom";
import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useUser from "@/hooks/user/useUser";
import { electionDetailsMockResponse, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, setupTestRouter, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import type { ElectionDetailsResponse, ElectionStatusResponse } from "@/types/generated/openapi";

import { dataEntryHomeRoutes } from "../routes";
import { DataEntryHomePage } from "./DataEntryHomePage";

const renderDataEntryHomePage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <MessagesProvider>
          <DataEntryHomePage />
        </MessagesProvider>
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

describe("DataEntryHomePage", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
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
    ).toBeVisible();
  });

  test("Alert not visible when uncompleted", async () => {
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

  test("Alert visible when completed", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "definitive" },
        { polling_station_id: 2, status: "definitive" },
      ],
    });

    renderDataEntryHomePage();

    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test("Resume input visible when some are uncompleted", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "first_entry_in_progress", first_entry_user_id: getTypistUser().user_id },
        { polling_station_id: 2, status: "first_entry_not_started" },
      ],
    } satisfies ElectionStatusResponse);

    renderDataEntryHomePage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Je hebt nog een openstaande invoer");
    const pollingStations = await within(alert).findAllByRole("link");
    expect(pollingStations.map((ps) => ps.textContent)).toEqual(["33 - Op Rolletjes"]);
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
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent(alertHeading);

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(alert);
    await user.click(within(alert).getByRole("button", { name: "Melding sluiten" }));
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
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent(alertHeading);

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(alert);
    await user.click(within(alert).getByRole("button", { name: "Melding sluiten" }));
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
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent(alertHeading);

    // Close the alert and expect it to be hidden
    const alertClosed = waitForElementToBeRemoved(alert);
    await user.click(within(alert).getByRole("button", { name: "Melding sluiten" }));
    await alertClosed;
  });

  test("Alert when committee session is paused is shown", async () => {
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(getElectionMockData({}, { status: "paused" }) satisfies ElectionDetailsResponse, {
          status: 200,
        }),
      ),
    );

    renderDataEntryHomePage();

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    const pausedModal = await screen.findByRole("dialog");
    expect(within(pausedModal).getByRole("heading", { level: 3, name: "Invoer gepauzeerd" })).toBeVisible();
    expect(within(pausedModal).getByRole("paragraph")).toHaveTextContent(
      "De coördinator heeft het invoeren van stemmen gepauzeerd. Je kan niet meer verder.",
    );
    expect(within(pausedModal).getByRole("link", { name: "Naar startscherm" })).toBeVisible();
    expect(within(pausedModal).getByRole("link", { name: "Afmelden" })).toBeVisible();
  });
});
