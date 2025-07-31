import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider.tsx";
import { ErrorBoundary } from "@/components/error/ErrorBoundary.tsx";
import { electionManagementRoutes } from "@/features/election_management/routes.tsx";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router.tsx";
import { overrideOnce, server } from "@/testing/server";
import {
  expectConflictErrorPage,
  renderReturningRouter,
  screen,
  setupTestRouter,
  spyOnHandler,
} from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider.tsx";
import { ElectionDetailsResponse, ErrorResponse } from "@/types/generated/openapi.ts";

import { ElectionReportPage } from "./ElectionReportPage";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const renderPage = async () => {
  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <ElectionReportPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();
  expect(
    await screen.findByRole("heading", { level: 2, name: "Telresultaten eerste zitting gemeente Heemdamseburg" }),
  ).toBeVisible();
  return router;
};

describe("ElectionReportPage", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
  });

  test("Shows page and click on back to overview", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    const router = await renderPage();

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
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await renderPage();

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
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const Providers = ({
      children,
      router = getRouter(children),
      fetchInitialUser = false,
    }: {
      children?: React.ReactNode;
      router?: Router;
      fetchInitialUser?: boolean;
    }) => {
      return (
        <ApiProvider fetchInitialUser={fetchInitialUser}>
          <TestUserProvider userRole="coordinator">
            <ElectionProvider electionId={1}>
              <ElectionStatusProvider electionId={1}>
                <RouterProvider router={router} />
              </ElectionStatusProvider>
            </ElectionProvider>
          </TestUserProvider>
          ,
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
  });
});
