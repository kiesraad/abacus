import { APIRequestContext, test as base, expect, Page } from "@playwright/test";

import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  Election,
  ELECTION_CREATE_REQUEST_PATH,
  ELECTION_DETAILS_REQUEST_PATH,
  ElectionDetailsResponse,
  POLLING_STATION_CREATE_REQUEST_PATH,
  POLLING_STATION_GET_REQUEST_PATH,
  PollingStation,
  User,
  USER_CREATE_REQUEST_BODY,
  USER_CREATE_REQUEST_PATH,
} from "@/types/generated/openapi";

import { DataEntryApiClient } from "./helpers-utils/api-clients";
import { completePollingStationDataEntries, loginAs } from "./helpers-utils/e2e-test-api-helpers";
import { createRandomUsername } from "./helpers-utils/e2e-test-utils";
import {
  committeeSessionStatusChangeRequest,
  dataEntryRequest,
  dataEntryWithDifferencesRequest,
  dataEntryWithErrorRequest,
  electionRequest,
  pollingStationRequests,
} from "./test-data/request-response-templates";

export const FIXTURE_TYPIST_TEMP_PASSWORD: string = "temp_password_9876";

// Regular fixtures need to be passed into the test's arguments.
type Fixtures = {
  // page and request fixture for coordinator
  coordinator: { page: Page; request: APIRequestContext };
  // page and request fixture for typist one
  typistOne: { page: Page; request: APIRequestContext };
  // page and request fixture for typist two
  typistTwo: { page: Page; request: APIRequestContext };
  // Election without polling stations
  emptyElection: Election;
  // Election with two polling stations
  election: ElectionDetailsResponse;
  // First polling station of the election
  pollingStation: PollingStation;
  // First polling station of the election with entry claimed by typist one
  pollingStationFirstEntryClaimed: PollingStation;
  // First polling station of the election with first data entry done
  pollingStationFirstEntryDone: PollingStation;
  // First polling station of the election with first data entry with errors
  pollingStationFirstEntryHasErrors: PollingStation;
  // First polling station of the election with first and second data entries done
  pollingStationDefinitive: PollingStation;
  // First polling station of the election with differences between the first and second data entry
  pollingStationEntriesDifferent: PollingStation;
  // First polling station of the election with second data entry that has errors and is therefore different
  pollingStationEntriesDifferentWithErrors: PollingStation;
  // Election with polling stations and two completed data entries for each
  completedElection: Election;
  // Newly created User
  newTypist: User;
};

export const test = base.extend<Fixtures>({
  coordinator: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/coordinator.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistOne: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistTwo: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist2.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  pollingStationFirstEntryClaimed: async ({ typistOne, pollingStation }, use) => {
    const { request } = typistOne;
    await loginAs(request, "typist1");

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await use(pollingStation);
  },
  emptyElection: async ({ request }, use) => {
    await loginAs(request, "admin1");
    // override the current storage state
    // create an election with no polling stations
    const url: ELECTION_CREATE_REQUEST_PATH = `/api/elections`;
    const electionResponse = await request.post(url, { data: electionRequest });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  election: async ({ request, emptyElection }, use) => {
    await loginAs(request, "admin1");
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
    const response = (await electionResponse.json()) as ElectionDetailsResponse;

    // Set committee session status to DataEntryInProgress
    await loginAs(request, "coordinator1");
    const statusChangeUrl: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${response.committee_session.id}/status`;
    const statusChangeResponse = await request.put(statusChangeUrl, { data: committeeSessionStatusChangeRequest });
    expect(statusChangeResponse.ok()).toBeTruthy();

    await use(response);
  },
  pollingStation: async ({ request, election }, use) => {
    await loginAs(request, "admin1");
    // get the first polling station of the existing election
    const url: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${election.election.id}/polling_stations/${election.polling_stations[0]?.id ?? 0}`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const pollingStation = (await response.json()) as PollingStation;

    await use(pollingStation);
  },
  pollingStationFirstEntryDone: async ({ request, pollingStation }, use) => {
    await loginAs(request, "typist1");

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(dataEntryRequest);
    await firstDataEntry.finalise();

    await use(pollingStation);
  },
  pollingStationFirstEntryHasErrors: async ({ request, pollingStation }, use) => {
    await loginAs(request, "typist1");

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(dataEntryWithErrorRequest);
    await firstDataEntry.finalise();

    await use(pollingStation);
  },
  pollingStationDefinitive: async ({ request, pollingStation }, use) => {
    await completePollingStationDataEntries(request, pollingStation.id);

    await use(pollingStation);
  },
  pollingStationEntriesDifferent: async ({ request, pollingStation }, use) => {
    await completePollingStationDataEntries(
      request,
      pollingStation.id,
      dataEntryRequest,
      dataEntryWithDifferencesRequest,
    );

    await use(pollingStation);
  },
  pollingStationEntriesDifferentWithErrors: async ({ request, pollingStation }, use) => {
    await completePollingStationDataEntries(request, pollingStation.id, dataEntryRequest, dataEntryWithErrorRequest);

    await use(pollingStation);
  },
  completedElection: async ({ request, election }, use) => {
    // finalise both data entries for all polling stations
    for (const pollingStationId of election.polling_stations.map((ps) => ps.id)) {
      await completePollingStationDataEntries(request, pollingStationId);
    }

    await use(election.election);
  },
  newTypist: async ({ request }, use) => {
    await loginAs(request, "admin1");
    // create a new user
    const url: USER_CREATE_REQUEST_PATH = "/api/user";
    const data: USER_CREATE_REQUEST_BODY = {
      role: "typist",
      username: createRandomUsername(),
      fullname: "Gebruiker met Achternaam",
      temp_password: FIXTURE_TYPIST_TEMP_PASSWORD,
    };
    const userResponse = await request.post(url, { data });
    expect(userResponse.ok()).toBeTruthy();

    await use((await userResponse.json()) as User);
  },
});
