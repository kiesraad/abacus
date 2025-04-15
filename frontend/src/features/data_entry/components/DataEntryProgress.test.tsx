import { useParams } from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationDataEntryClaimHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";

import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";

// TODO: consider replacing the "idle" returned at the end of menuStatusForFormSection with something different than "idle".
//      It's for forms that have not been visited yet.
//      Reason: the active attribute can also set an "idle" class

// How to change the values of useDataEntryContext()? Through the PollingStationDataEntryClaimHandler?

vi.mock("react-router");

function renderForm() {
  return render(
    <ElectionProvider electionId={1}>
      <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
        <DataEntryProgress />
      </DataEntryProvider>
    </ElectionProvider>,
  );
}

describe("Test DataEntryProgress", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler);
    vi.mocked(useParams).mockReturnValue({ pollingStationId: "1" });
  });

  test("first test", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Is er herteld?")).toBeVisible();
    });

    const recounted = screen.getByTestId("list-item-recounted");
    const votersAndVotes = screen.getByTestId("list-item-voters-and-votes");
    const differences = screen.getByTestId("list-item-differences");
    const list1 = screen.getByTestId("list-item-pg-1");
    const list2 = screen.getByTestId("list-item-pg-2");
    const checkAndSave = screen.getByTestId("list-item-save");

    expect(recounted).toHaveClass("accept active");
    expect(recounted).toHaveAttribute("aria-current", "step");

    expect(votersAndVotes).toHaveClass("idle idle disabled");
    expect(votersAndVotes).toHaveAttribute("aria-current", "false");

    expect(differences).toHaveClass("idle idle disabled");
    expect(differences).toHaveAttribute("aria-current", "false");

    expect(list1).toHaveClass("idle idle disabled");
    expect(list1).toHaveAttribute("aria-current", "false");

    expect(list2).toHaveClass("idle idle disabled");
    expect(list2).toHaveAttribute("aria-current", "false");

    expect(checkAndSave).toHaveClass("idle idle disabled");
    expect(checkAndSave).toHaveAttribute("aria-current", "false");
  });
});
