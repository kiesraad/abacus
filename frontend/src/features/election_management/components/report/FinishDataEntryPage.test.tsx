import * as ReactRouter from "react-router";
import { ReactNode } from "react";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import {
  expectConflictErrorPage,
  renderReturningRouter,
  screen,
  setupTestRouter,
  spyOnHandler,
  waitFor,
} from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionDetailsResponse, ErrorResponse, PollingStation } from "@/types/generated/openapi";

import { FinishDataEntryPage } from "./FinishDataEntryPage";

const navigate = vi.fn();

const renderPage = async (sessionNumber: number) => {
  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <FinishDataEntryPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: `Steminvoer ${sessionNumber === 1 ? "eerste" : "tweede"} zitting afronden`,
    }),
  ).toBeVisible();
  return router;
};

describe("FinishDataEntryPage", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Shows page and click on finish data entry phase", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_in_progress" }));

    await renderPage(1);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "In invoerfase blijven" })).toBeVisible();

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    const finishButton = screen.getByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();
    await user.click(finishButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_finished" });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/report/committee-session/1/download");
    });
  });

  test("Shows error page when finish data entry call returns an error", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Providers = ({
      children,
      router = getRouter(children),
      fetchInitialUser = false,
    }: {
      children?: ReactNode;
      router?: Router;
      fetchInitialUser?: boolean;
    }) => {
      return (
        <ApiProvider fetchInitialUser={fetchInitialUser}>
          <TestUserProvider userRole="coordinator">
            <ElectionProvider electionId={1}>
              <ElectionStatusProvider electionId={1}>
                <ReactRouter.RouterProvider router={router} />
              </ElectionStatusProvider>
            </ElectionProvider>
          </TestUserProvider>
        </ApiProvider>
      );
    };
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId",
            children: electionManagementRoutes,
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    const electionData = getElectionMockData({}, { status: "data_entry_finished" });
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    overrideOnce("put", "/api/committee_sessions/1/status", 409, {
      error: "Invalid committee session status",
      fatal: true,
      reference: "InvalidCommitteeSessionStatus",
    } satisfies ErrorResponse);

    await router.navigate("/elections/1/report");

    rtlRender(<Providers router={router} />);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Steminvoer eerste zitting afronden" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "In invoerfase blijven" })).toBeVisible();

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    const finishButton = screen.getByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();
    await user.click(finishButton);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });

  test("Shows page and click on stay in data entry phase", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_in_progress" }));

    const router = await renderPage(1);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Invoerfase afronden" })).toBeVisible();

    const cancelButton = screen.getByRole("link", { name: "In invoerfase blijven" });
    expect(cancelButton).toBeVisible();
    await user.click(cancelButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/status");
  });

  test("Redirect to investigations overview if investigations are unhandled", async () => {
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData({}, { number: 2 }, [
        {
          polling_station_id: 1,
          reason: "Test reason 1",
        },
        {
          polling_station_id: 2,
          reason: "Test reason 2",
          findings: "Test findings 2",
          corrected_results: false,
        },
        {
          polling_station_id: 3,
          reason: "Test reason 3",
          findings: "Test findings 3",
          corrected_results: false,
        },
      ]),
      polling_stations: pollingStationMockData.slice(0, 3),
    });

    await renderPage(2);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
  });

  test("Redirect to investigations overview if investigations are missing", async () => {
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData({}, { number: 2 }),
      polling_stations: [
        ...pollingStationMockData.slice(0, 3),
        {
          ...pollingStationMockData[4]!,
          id_prev_session: undefined,
        },
      ] satisfies PollingStation[],
    });

    await renderPage(2);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/investigations");
    });
  });

  test("Do not redirect to investigations overview in first committee session", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());

    await renderPage(1);

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalledWith("/elections/1/investigations");
    });
  });

  test("Redirect to report download page when committee session status is already data_entry_finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await renderPage(1);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1/report/committee-session/1/download");
    });
  });
});
