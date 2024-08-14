import * as Router from "react-router";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PollingStationLayout } from "app/module/input";
import { overrideOnce, render, screen, server, within } from "app/test/unit";

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
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionMockResponse);
    overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
    vi.spyOn(Router, "useParams").mockReturnValue({
      electionId: electionMock.id.toString(),
      pollingStationId: pollingStationMock.id.toString(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    server.restoreHandlers();
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

    // Wait for the page to be loaded and check if the polling station information is displayed
    expect(await screen.findByRole("heading", { level: 1, name: pollingStationMock.name }));
    expect(await screen.findByText(pollingStationMock.number));

    // Check if the navigation bar displays the correct information
    const nav = await screen.findByRole("navigation", { name: /primary-navigation/i });
    expect(within(nav).getByRole("link", { name: "Overzicht" })).toHaveAttribute(
      "href",
      "/overview",
    );
    expect(within(nav).getByRole("link", { name: electionMock.name })).toHaveAttribute(
      "href",
      `/${electionMock.id}/input`,
    );
  });
});
