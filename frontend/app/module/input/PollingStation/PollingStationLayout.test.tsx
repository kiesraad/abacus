// TODO: You should apparently never import from "react-router" directly, but from "react-router-dom"
//  (https://github.com/remix-run/react-router/tree/main/packages/react-router#react-router)
//  but this seems to be the only way to make the test work, but eslint says:
//  5:8  error  No default export found in imported module "react-router"  import/default
import Router from "react-router";

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
