import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { useUser } from "@/hooks/user/useUser";
import { electionDetailsMockResponse, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, setupTestRouter } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";

import { dataEntryRoutes } from "../routes";

vi.mock("@/hooks/user/useUser");

describe("DataEntryPage", () => {
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
            path: "elections/:electionId/data-entry/:pollingStationId/:entryNumber",
            children: dataEntryRoutes,
          },
        ],
      },
    ]);

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await router.navigate("/elections/1/data-entry/1/1");

    rtlRender(<Providers router={router} />);

    await expectErrorPage();
  });
});
