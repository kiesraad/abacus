import { beforeEach, describe, expect, test, vi } from "vitest";

import { PollingStationLayout } from "app/module/data_entry";

import { Election, ElectionListProvider, ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { electionDetailsMockResponse, pollingStationMockData } from "@kiesraad/api-mocks";
import { overrideOnce, render, screen, within } from "@kiesraad/test";

import { PollingStationFormController } from "../../../component/form/data_entry/PollingStationFormController";

vi.mock(import("@kiesraad/util"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNumericParam: vi.fn().mockReturnValue(1),
}));

describe("PollingStationLayout", () => {
  const election = electionDetailsMockResponse.election as Required<Election>;

  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  });

  test("Render", async () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={election.id}>
          <ElectionStatusProvider electionId={election.id}>
            <PollingStationFormController
              election={election}
              pollingStationId={pollingStationMockData.id}
              entryNumber={1}
            >
              <PollingStationLayout />
            </PollingStationFormController>
          </ElectionStatusProvider>
        </ElectionProvider>
      </ElectionListProvider>,
    );

    // Wait for the page to be loaded and check if the polling station information is displayed
    expect(await screen.findByRole("heading", { level: 1, name: pollingStationMockData.name }));
    expect(await screen.findByText(pollingStationMockData.number));

    // Check if the navigation bar displays the correct information
    const nav = await screen.findByRole("navigation", { name: /primary-navigation/i });
    expect(within(nav).getByRole("link", { name: "Overzicht" })).toHaveAttribute("href", "/elections");
    expect(within(nav).getByRole("link", { name: new RegExp(election.name) })).toHaveAttribute(
      "href",
      `/elections/${election.id}/data-entry`,
    );
  });
});
