import { describe, expect, test } from "vitest";

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
  test("Render", async () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={1}>
          <PollingStationListProvider electionId={1}>
            <PollingStationFormController
              election={electionMock}
              pollingStationId={1}
              entryNumber={1}
            >
              <PollingStationLayout />
            </PollingStationFormController>
          </PollingStationListProvider>
        </ElectionProvider>
      </ElectionListProvider>,
    );
    expect(true).toBe(true);
    expect(await screen.findByText(pollingStationMock.name));
    expect(await screen.findByText(pollingStationMock.number));
  });
});
