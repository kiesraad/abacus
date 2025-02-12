import { beforeEach, describe, expect, test, vi } from "vitest";

import { PollingStationLayout } from "app/module/data_entry";

import { Election, ElectionListProvider, ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import {
  electionDetailsMockResponse,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntrySaveHandler,
  pollingStationMockData,
} from "@kiesraad/api-mocks";
import { render, screen, server } from "@kiesraad/test";

import { PollingStationFormController } from "../../../component/form/data_entry/PollingStationFormController";

vi.mock(import("@kiesraad/util"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNumericParam: () => 1,
}));

describe("PollingStationLayout", () => {
  const election = electionDetailsMockResponse.election as Required<Election>;

  beforeEach(() => {
    server.use(
      ElectionListRequestHandler,
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      PollingStationDataEntryGetHandler,
      PollingStationDataEntrySaveHandler,
    );
  });

  test("Render", async () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={election.id}>
          <ElectionStatusProvider electionId={election.id}>
            <PollingStationFormController election={election} pollingStationId={1} entryNumber={1}>
              <PollingStationLayout />
            </PollingStationFormController>
          </ElectionStatusProvider>
        </ElectionProvider>
      </ElectionListProvider>,
    );

    // Wait for the page to be loaded and check if the polling station information is displayed
    const pollingStation = pollingStationMockData[0]!;
    expect(await screen.findByRole("heading", { level: 1, name: pollingStation.name }));
    expect(await screen.findByText(pollingStation.number));
  });
});
