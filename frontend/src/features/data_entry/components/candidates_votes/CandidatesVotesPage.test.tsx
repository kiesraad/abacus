import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationDataEntryClaimHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";

import { DataEntryProvider } from "../DataEntryProvider";
import { CandidatesVotesPage } from "./CandidatesVotesPage";

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

const { mockedUseNumericParam } = vi.hoisted(() => {
  return { mockedUseNumericParam: vi.fn() };
});

vi.mock(import("@/hooks/useNumericParam"), () => ({
  useNumericParam: mockedUseNumericParam,
}));

describe("Test CandidatesVotesPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler);
  });

  test("list not found shows error", async () => {
    mockedUseNumericParam.mockReturnValue(123);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Geen lijst gevonden voor 123")).toBeVisible();
    });
  });

  test("list found shows form", async () => {
    mockedUseNumericParam.mockReturnValue(1);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("group", { name: "Lijst 1 - Vurige Vleugels Partij" })).toBeVisible();
    });
  });
});
