import { useParams } from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationDataEntryClaimHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";

import { DataEntryProvider } from "../DataEntryProvider";
import { CandidatesVotesPage } from "./CandidatesVotesPage";

vi.mock("react-router");

function renderPage() {
  return render(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <ElectionProvider electionId={1}>
        <CandidatesVotesPage></CandidatesVotesPage>
      </ElectionProvider>
      )
    </DataEntryProvider>,
  );
}

describe("Test CandidatesVotesPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler);
  });

  test("list not found shows error", async () => {
    vi.mocked(useParams).mockReturnValue({ listNumber: "123" });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Geen lijst gevonden voor 123")).toBeVisible();
    });
  });

  test("list found shows form", async () => {
    vi.mocked(useParams).mockReturnValue({ listNumber: "1" });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("group", { name: "Lijst 1 - Vurige Vleugels Partij" })).toBeVisible();
    });
  });
});
