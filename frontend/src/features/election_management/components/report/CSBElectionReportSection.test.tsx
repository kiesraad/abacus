import { render as rtlRender, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getCSBElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { CSBElectionRequestHandler, CSBElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { renderReturningRouter } from "@/testing/test-utils";
import type { ApportionmentState } from "@/types/generated/openapi";
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

const renderPage = () => {
  return renderReturningRouter(
    <ElectionProvider electionId={2}>
      <ElectionStatusProvider electionId={2}>
        <ElectionReportPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
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

  test("Redirect when apportionment state is not Finalised", async () => {
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

    const router = renderPage();

    await router.navigate("/elections/2/report/committee-session/2/download");

    rtlRender(<Providers router={router} />);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/2/apportionment");
    });
  });
});
