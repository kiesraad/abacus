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

import { FinishDataEntryPage } from "./FinishDataEntryPage";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const renderPage = async () => {
  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <FinishDataEntryPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Steminvoer eerste zitting afronden" })).toBeVisible();
  return router;
};

describe("FinishDataEntryPage", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
  });

  test("Shows page and click on finish data entry phase", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_in_progress" }));

    await renderPage();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "In invoerfase blijven" })).toBeVisible();

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    const finishButton = screen.getByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();
    await user.click(finishButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_finished" });
    expect(navigate).toHaveBeenCalledWith("/elections/1/report/download");
  });

  test("Shows error page when finish data entry call returns an error", async () => {
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
  });

  test("Shows page and click on stay in data entry phase", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_in_progress" }));

    const router = await renderPage();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Invoerfase afronden" })).toBeVisible();

    const cancelButton = screen.getByRole("link", { name: "In invoerfase blijven" });
    expect(cancelButton).toBeVisible();
    await user.click(cancelButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/status");
  });

  test("Redirect to report download page when committee session status is already data_entry_finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await renderPage();

    expect(navigate).toHaveBeenCalledWith("/elections/1/report/download");
  });
});
