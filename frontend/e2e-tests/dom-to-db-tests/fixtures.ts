import { test as base, expect } from "@playwright/test";

import {
  Election,
  ELECTION_DETAILS_REQUEST_PATH,
  ElectionDetailsResponse,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
  POLLING_STATION_GET_REQUEST_PATH,
  PollingStation,
} from "@kiesraad/api";

import { noRecountNoDifferencesRequest } from "./test-data/request-response-templates";

type AutoFixtures = {
  // AutoFixtures contain { auto: true } and are called for each test automatically.
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  resetDatabase: void;
};

type Fixtures = {
  // Regular fixtures need to be passed into the test's arguments.
  pollingStation1: PollingStation;
  completedElection: Election;
};

export const test = base.extend<AutoFixtures & Fixtures>({
  resetDatabase: [
    async ({ request }, use) => {
      const response = await request.post(`/reset`);
      expect(response.ok()).toBeTruthy();
      await use();
    },
    { auto: true },
  ],
  pollingStation1: async ({ request }, use) => {
    const url: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/1/polling_stations/1`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const pollingStation = (await response.json()) as PollingStation;
    await use(pollingStation);
  },
  completedElection: async ({ request }, use) => {
    const url: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/1`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const election = (await response.json()) as ElectionDetailsResponse;

    for (const pollingStationId of [1, 2]) {
      for (const entryNumber of [1, 2]) {
        const save_url: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
        const saveResponse = await request.post(save_url, {
          data: noRecountNoDifferencesRequest,
        });
        expect(saveResponse.ok()).toBeTruthy();
        const finalise_url: POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}/finalise`;
        const finaliseResponse = await request.post(finalise_url);
        expect(finaliseResponse.ok()).toBeTruthy();
      }
    }

    await use(election.election);
  },
});
