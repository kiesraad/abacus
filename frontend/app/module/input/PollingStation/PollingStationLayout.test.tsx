import * as Router from "react-router";

import { describe, expect, test, vi } from "vitest";

import { PollingStationLayout } from "app/module/input";
import { overrideOnce, render, screen } from "app/test/unit";

import {
  ElectionListProvider,
  ElectionProvider,
  PollingStationFormController,
  PollingStationListProvider,
} from "@kiesraad/api";
import {
  electionMock,
  electionMockResponse,
  pollingStationMock,
  pollingStationsMockResponse,
} from "@kiesraad/api-mocks";

describe("PollingStationLayout", () => {
  overrideOnce("get", "/api/elections/1", 200, electionMockResponse);
  overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
  vi.spyOn(Router, "useParams").mockReturnValue({
    electionId: electionMock.id.toString(),
    pollingStationId: pollingStationMock.id.toString(),
  });
  test("Render", async () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={electionMock.id}>
          <PollingStationListProvider electionId={electionMock.id}>
            <PollingStationFormController
              election={electionMock}
              pollingStationId={pollingStationMock.id}
              entryNumber={1}
            >
              <PollingStationLayout />
            </PollingStationFormController>
          </PollingStationListProvider>
        </ElectionProvider>
      </ElectionListProvider>,
    );
    expect(await screen.findByText(pollingStationMock.name));
    expect(await screen.findByText(pollingStationMock.number));
  });
});
