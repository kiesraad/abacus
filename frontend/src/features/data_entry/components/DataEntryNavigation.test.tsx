import { Navigate, RouterProvider } from "react-router";

import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useUser } from "@/hooks/user/useUser";
import { setupTestRouter } from "@/testing/test-utils";
import { PollingStationResults } from "@/types/generated/openapi";

import { useDataEntryContext } from "../hooks/useDataEntryContext";
import { getDefaultDataEntryStateAndActionsLoaded, getDefaultUser } from "../testing/mock-data";
import { DataEntryStateAndActionsLoaded, Status, SubmitCurrentFormOptions } from "../types/types";
import { DataEntryNavigation } from "./DataEntryNavigation";

vi.mock("react-router");
vi.mock("@/hooks/user/useUser");
vi.mock("../hooks/useDataEntryContext");

const testPath = "/elections/1/data-entry/2/3";

function renderComponent(
  onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>,
  currentValues?: Partial<PollingStationResults>,
) {
  const router = setupTestRouter([
    {
      path: "/",
      element: <Navigate to={testPath} replace />,
    },
    {
      path: "/elections/:electionId/data-entry/:pollingStationId/:entryNumber",
      element: <DataEntryNavigation onSubmit={onSubmit} currentValues={currentValues} />,
    },
    {
      path: "/test",
      element: <div>Test</div>,
    },
  ]);

  render(<RouterProvider router={router} />);
  return router;
}

describe("DataEntryNavigation", () => {
  test("renders without crashing", () => {
    vi.mocked(useDataEntryContext).mockReturnValue(getDefaultDataEntryStateAndActionsLoaded());
    vi.mocked(useUser).mockReturnValue(getDefaultUser());
    const router = renderComponent(vi.fn());
    expect(router.state.location.pathname).toBe("/elections/1/data-entry/2/3");
  });

  test.each<Status>(["deleted", "finalised", "finalising", "aborted"])(
    "Doesnt block navigation for status: %s",
    async (status) => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status,
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());
      const router = renderComponent(vi.fn());
      await router.navigate("/test");
      expect(router.state.location.pathname).toBe("/test");
    },
  );

  test("Blocks when navigating toutside data entry flow", async () => {
    const state: DataEntryStateAndActionsLoaded = {
      ...getDefaultDataEntryStateAndActionsLoaded(),
      status: "idle",
    };

    vi.mocked(useDataEntryContext).mockReturnValue(state);
    vi.mocked(useUser).mockReturnValue(getDefaultUser());
    const router = renderComponent(vi.fn());
    await router.navigate("/test");
    expect(router.state.location.pathname).toBe(testPath);
  });
});
