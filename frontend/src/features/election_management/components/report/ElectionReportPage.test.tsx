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
import { ElectionDetailsResponse, ErrorResponse } from "@/types/generated/openapi";

import { ElectionReportPage } from "./ElectionReportPage";

const navigate = vi.fn();

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

const renderPage = () => {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <ElectionReportPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
};

describe("ElectionReportPage", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
  });

  test("Redirects to CommitteeSessionDetailsPage when details are not filled in", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    renderPage();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/details#redirect-to-report");
    });
  });

  test("Shows page and click on back to overview", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        { status: "data_entry_finished", location: "Den Haag", start_date: "2026-03-18", start_time: "21:36" },
      ),
    );

    const router = renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Telresultaten eerste zitting gemeente Heemdamseburg" }),
    ).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download los proces-verbaal" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download proces-verbaal met telbestand" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Steminvoer hervatten" })).toBeVisible();

    const backButton = screen.getByRole("link", { name: "Terug naar overzicht" });
    expect(backButton).toBeVisible();
    await user.click(backButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/");
  });

  test("Shows page and click on resume data entry", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        { status: "data_entry_finished", location: "Den Haag", start_date: "2026-03-18", start_time: "21:36" },
      ),
    );

    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Telresultaten eerste zitting gemeente Heemdamseburg" }),
    ).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download los proces-verbaal" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download proces-verbaal met telbestand" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

    const resumeButton = screen.getByRole("button", { name: "Steminvoer hervatten" });
    expect(resumeButton).toBeVisible();
    await user.click(resumeButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).toHaveBeenCalledWith("../../status");
  });

  test("Shows error page when resume data entry call returns an error", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    const electionData = getElectionMockData(
      {},
      { status: "data_entry_finished", location: "Den Haag", start_date: "2026-03-18", start_time: "21:36" },
    );
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

    await router.navigate("/elections/1/report/download");

    rtlRender(<Providers router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Telresultaten eerste zitting gemeente Heemdamseburg" }),
    ).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download los proces-verbaal" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download proces-verbaal met telbestand" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

    const resumeButton = screen.getByRole("button", { name: "Steminvoer hervatten" });
    expect(resumeButton).toBeVisible();
    await user.click(resumeButton);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });

  test("Error when committee session status is not DataEntryFinished", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
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

    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        { status: "data_entry_in_progress", location: "Den Haag", start_date: "2026-03-18", start_time: "21:36" },
      ),
    );

    await router.navigate("/elections/1/report/download");

    rtlRender(<Providers router={router} />);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });
});
