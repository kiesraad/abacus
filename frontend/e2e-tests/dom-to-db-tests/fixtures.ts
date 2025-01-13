/* eslint-disable playwright/no-standalone-expect */
import { test as base, expect } from "@playwright/test";

import {
  Election,
  ELECTION_CREATE_REQUEST_PATH,
  ELECTION_DETAILS_REQUEST_PATH,
  ElectionDetailsResponse,
  POLLING_STATION_CREATE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
  POLLING_STATION_GET_REQUEST_PATH,
  PollingStation,
} from "@kiesraad/api";

import {
  electionRequest,
  noRecountNoDifferencesRequest,
  pollingStationRequests,
} from "./test-data/request-response-templates";

// Regular fixtures need to be passed into the test's arguments.
type Fixtures = {
  // Election without polling stations
  emptyElection: Election;
  // Election with two polling stations
  election: ElectionDetailsResponse;
  // First polling station of the election
  pollingStation: PollingStation;
  // Election with polling stations and two completed data entries for each
  completedElection: Election;
};

export const test = base.extend<Fixtures>({
  emptyElection: async ({ request }, use) => {
    // create an election with no polling stations
    const url: ELECTION_CREATE_REQUEST_PATH = `/api/elections`;
    const electionResponse = await request.post(url, { data: electionRequest });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  election: async ({ request, emptyElection }, use) => {
    // create polling stations in the existing emptyElection
    const url: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${emptyElection.id}/polling_stations`;
    for (const pollingStationRequest of pollingStationRequests) {
      const pollingStationResponse = await request.post(url, { data: pollingStationRequest });
      expect(pollingStationResponse.ok()).toBeTruthy();
    }

    // get election details
    const electionUrl: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${emptyElection.id}`;
    const electionResponse = await request.get(electionUrl);
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as ElectionDetailsResponse;

    await use(election);
  },
  pollingStation: async ({ request, election }, use) => {
    // get the first polling station of the existing election
    const url: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${election.election.id}/polling_stations/${election.polling_stations[0]?.id ?? 0}`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const pollingStation = (await response.json()) as PollingStation;

    await use(pollingStation);
  },
  completedElection: async ({ request, election }, use) => {
    // finalise both data entries for all polling stations
    for (const pollingStationId of election.polling_stations.map((ps) => ps.id)) {
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
