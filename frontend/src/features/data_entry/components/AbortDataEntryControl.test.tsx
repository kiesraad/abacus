import { RouterProvider } from "react-router";

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiResponseStatus } from "@/api/ApiResult";
import { useElection } from "@/hooks/election/useElection";
import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { AbortDataEntryControl } from "./AbortDataEntryControl";

vi.mock("@/hooks/election/useElection");

function renderComponent() {
  const router = setupTestRouter([
    {
      path: "/",
      element: <AbortDataEntryControl />,
    },
    {
      path: "/elections/:election-id/data-entry",
      element: <div>test</div>,
    },
  ]);

  render(<RouterProvider router={router} />);
  return router;
}

describe("AbortDataEntryControl", () => {
  beforeEach(() => {
    vi.mocked(useElection).mockReturnValue({
      committeeSession: committeeSessionMockData,
      election: electionMockData,
      pollingStations: [],
      pollingStation: undefined,
      refetch: () =>
        Promise.resolve({
          status: ApiResponseStatus.Success,
          code: 200,
          data: { committee_session: committeeSessionMockData, election: electionMockData, polling_stations: [] },
        }),
    });
  });

  test("renders correctly", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: "Invoer afbreken" })).toBeVisible();
  });

  test("redirects correctly", () => {
    const router = renderComponent();
    const button = screen.getByRole("button", { name: "Invoer afbreken" });
    button.click();

    expect(router.state.location.pathname).toBe(`/elections/${electionMockData.id}/data-entry`);
  });
});
