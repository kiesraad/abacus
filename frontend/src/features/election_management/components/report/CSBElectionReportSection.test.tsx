import { render as rtlRender } from "@testing-library/react";
import type { ReactNode } from "react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getCSBElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { CSBElectionRequestHandler, CSBElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { expectConflictErrorPage, setupTestRouter } from "@/testing/test-utils";
import type { ApportionmentState } from "@/types/generated/openapi";

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
      <TestUserProvider userRole="coordinator_csb">
        <ElectionProvider electionId={2}>
          <ElectionStatusProvider electionId={2}>
            <ReactRouter.RouterProvider router={router} />
          </ElectionStatusProvider>
        </ElectionProvider>
      </TestUserProvider>
    </ApiProvider>
  );
};

describe("CSBElectionReportSection", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
    server.use(CSBElectionRequestHandler, CSBElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ committeeSessionId: "2" });
  });

  test("Error when apportionment state is not Finalised", async () => {
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
      "/api/elections/2",
      200,
      getCSBElectionMockData({}, { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" }),
    );
    overrideOnce("get", "/api/elections/2/apportionment/state", 200, {
      type: "RegisteringDeceasedCandidates",
      deceased_candidates: [],
    } satisfies ApportionmentState);

    await router.navigate("/elections/2/report/committee-session/2/download");

    rtlRender(<Providers router={router} />);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });
});
