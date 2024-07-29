import { describe, expect, test } from "vitest";

import { DataEntryLayout } from "app/module/input";
import { render, screen } from "app/test/unit";

import {
  ElectionListProvider,
  ElectionProvider,
  PollingStationFormController,
  PollingStationProvider,
} from "@kiesraad/api";
import { electionMock, pollingStationMock } from "@kiesraad/api-mocks";

describe("DataEntryLayout", () => {
  test("Render", async () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={1}>
          <PollingStationProvider pollingStationId={1}>
            <PollingStationFormController
              election={electionMock}
              pollingStationId={1}
              entryNumber={1}
            >
              <DataEntryLayout />
            </PollingStationFormController>
          </PollingStationProvider>
        </ElectionProvider>
      </ElectionListProvider>,
    );
    expect(true).toBe(true);
    expect(await screen.findByText(pollingStationMock.name));
    expect(await screen.findByText(pollingStationMock.number));
  });
});
