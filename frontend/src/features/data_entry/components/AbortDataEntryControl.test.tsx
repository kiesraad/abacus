import { RouterProvider } from "react-router";

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useElection from "@/hooks/election/useElection";
import { ApiResponseStatus } from "@/api/ApiResult";
import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { AbortDataEntryControl } from "./AbortDataEntryControl";

function renderComponent() {
  const router = setupTestRouter([
    {
      path: "/",
      element: <AbortDataEntryControl />,
      handle: { public: true },
    },
    {
      path: "/elections/:election-id/data-entry",
      element: <div>test</div>,
      handle: { public: true },
    },
  ]);

  render(<RouterProvider router={router} />);
  return router;
}

describe("AbortDataEntryControl", () => {
  beforeEach(() => {
    vi.spyOn(useElection, "useElection").mockReturnValue({
      currentCommitteeSession: committeeSessionMockData,
      committeeSessions: [committeeSessionMockData],
      election: electionMockData,
      pollingStations: [],
      pollingStation: undefined,
      investigations: [],
      investigation: undefined,
      refetch: () =>
        Promise.resolve({
          status: ApiResponseStatus.Success,
          code: 200,
          data: {
            current_committee_session: committeeSessionMockData,
            committee_sessions: [committeeSessionMockData],
            election: electionMockData,
            polling_stations: [],
            investigations: [],
          },
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
