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
import { render, screen, server, within } from "@kiesraad/test";

import { PollingStationFormController } from "../../../component/form/data_entry/PollingStationFormController";

vi.mock(import("@kiesraad/util"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNumericParam: vi.fn().mockReturnValue(1),
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

    // Check if the navigation bar displays the correct information
    const nav = await screen.findByRole("navigation", { name: /primary-navigation/i });
    expect(within(nav).getByRole("link", { name: "Overzicht" })).toHaveAttribute("href", "/elections");
    expect(within(nav).getByRole("link", { name: new RegExp(election.name) })).toHaveAttribute(
      "href",
      `/elections/${election.id}/data-entry`,
    );
  });
});
