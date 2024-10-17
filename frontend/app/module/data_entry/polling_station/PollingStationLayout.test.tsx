import * as Router from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { PollingStationLayout } from "app/module/data_entry";
import { overrideOnce, render, screen, within } from "app/test/unit";

import {
  Election,
  ElectionListProvider,
  ElectionProvider,
  ElectionStatusProvider,
  PollingStationFormController,
} from "@kiesraad/api";
import { electionDetailsMockResponse, pollingStationMockData } from "@kiesraad/api-mocks";

describe("PollingStationLayout", () => {
  const election = electionDetailsMockResponse.election as Required<Election>;

  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);

    vi.spyOn(Router, "useParams").mockReturnValue({
      electionId: election.id.toString(),
      pollingStationId: pollingStationMockData.id.toString(),
    });
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
    expect(within(nav).getByRole("link", { name: election.name })).toHaveAttribute(
      "href",
      `/elections/${election.id}/data-entry`,
    );
  });
});
