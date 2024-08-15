import * as Router from "react-router";

import { describe, expect, test, vi } from "vitest";

import { PollingStationLayout } from "app/module/input";
import { overrideOnce, render, screen } from "app/test/unit";

import {
  Election,
  ElectionListProvider,
  ElectionProvider,
  PollingStationFormController,
  PollingStationListProvider,
} from "@kiesraad/api";
import {
  electionDetailsMockResponse,
  pollingStationMockData,
  pollingStationsMockResponse,
} from "@kiesraad/api-mocks";

describe("PollingStationLayout", () => {
  overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
  const election = electionDetailsMockResponse.election as Required<Election>;
  vi.spyOn(Router, "useParams").mockReturnValue({
    electionId: election.id.toString(),
    pollingStationId: pollingStationMockData.id.toString(),
  });
  test("Render", async () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={election.id}>
          <PollingStationListProvider electionId={election.id}>
            <PollingStationFormController
              election={election}
              pollingStationId={pollingStationMockData.id}
              entryNumber={1}
            >
              <PollingStationLayout />
            </PollingStationFormController>
          </PollingStationListProvider>
        </ElectionProvider>
      </ElectionListProvider>,
    );
    expect(await screen.findByText(pollingStationMockData.name));
    expect(await screen.findByText(pollingStationMockData.number));
  });
});
