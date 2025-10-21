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
import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
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
import { CommitteeSession, ElectionDetailsResponse, ErrorResponse } from "@/types/generated/openapi";

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
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ committeeSessionId: "1" });
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
        { status: "data_entry_finished", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      ),
    );

    const router = renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Eerste zitting Gemeentelijk Stembureau" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
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
        { status: "data_entry_finished", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Eerste zitting Gemeentelijk Stembureau" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

    const resumeButton = screen.getByRole("button", { name: "Steminvoer hervatten" });
    expect(resumeButton).toBeVisible();
    await user.click(resumeButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).toHaveBeenCalledWith("../../status");
  });

  test("Does not show resume data entry button when not current committee session", async () => {
    const committeeSessionData: Partial<CommitteeSession> = {
      status: "data_entry_finished",
      location: "Den Haag",
      start_date_time: "2026-03-18T21:36:00",
    };
    const electionData = getElectionMockData({}, { id: 2, number: 2, ...committeeSessionData });
    electionData.committee_sessions = [
      getCommitteeSessionMockData({ id: 2, number: 2, ...committeeSessionData }),
      getCommitteeSessionMockData({ id: 1, number: 1, ...committeeSessionData }),
    ];
    overrideOnce("get", "/api/elections/1", 200, electionData);

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Eerste zitting Gemeentelijk Stembureau" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();
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
      { status: "data_entry_finished", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
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

    await router.navigate("/elections/1/report/committee-session/1/download");

    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Eerste zitting Gemeentelijk Stembureau" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
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
        { status: "data_entry_in_progress", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      ),
    );

    await router.navigate("/elections/1/report/committee-session/1/download");

    rtlRender(<Providers router={router} />);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });

  test("If there is an investigation with corrections, page refers to three documents in the zip", async () => {
    const router = renderPage();
    const electionData = getElectionMockData(
      {},
      { status: "data_entry_finished", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
    );

    // Set to second session and update investigations
    electionData.current_committee_session.number = 2;
    electionData.investigations.map((i) => (i.corrected_results = true));

    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await router.navigate("/elections/1/report/committee-session/1/download");

    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tweede zitting Gemeentelijk Stembureau" }),
    ).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten tweede zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();

    expect(screen.getByText("In het Zip bestand zitten drie documenten:")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten tweede zitting/ })).toBeVisible();
  });

  test("If there is an investigation without corrections, page refers to one document in the zip", async () => {
    const router = renderPage();
    const electionData = getElectionMockData(
      {},
      { status: "data_entry_finished", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
    );

    // Set to second session and update investigations
    electionData.current_committee_session.number = 2;
    electionData.investigations.map((i) => (i.corrected_results = false));

    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await router.navigate("/elections/1/report/committee-session/1/download");

    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tweede zitting Gemeentelijk Stembureau" }),
    ).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten tweede zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();

    expect(screen.getByText("In het Zip bestand zit één document:")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten tweede zitting/ })).toBeVisible();
  });
});
