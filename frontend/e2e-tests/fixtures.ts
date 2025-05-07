import { APIRequestContext, test as base, expect, Page } from "@playwright/test";

import {
  DataEntry,
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
import { createRandomUsername } from "./helpers-utils/e2e-test-utils";
import { loginAs } from "./setup";
import {
  electionRequest,
  noRecountNoDifferencesRequest,
  pollingStationRequests,
} from "./test-data/request-response-templates";

export const FIXTURE_TYPIST_TEMP_PASSWORD: string = "temp_password_9876";

// Regular fixtures need to be passed into the test's arguments.
type Fixtures = {
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
  // First polling station of the election with first and second data entries done
  pollingStationDefinitive: PollingStation;
  // First polling station of the election with differences between the first and second data entry
  pollingStationEntriesDifferent: PollingStation;
  // Election with polling stations and two completed data entries for each
  completedElection: Election;
  // Newly created User
  user: User;
};

async function completePollingStationDataEntries(request: APIRequestContext, pollingStationId: number) {
  for (const entryNumber of [1, 2]) {
    if (entryNumber === 1) {
      await loginAs(request, "typist");
    } else if (entryNumber === 2) {
      await loginAs(request, "typist2");
    }

    const dataEntry = new DataEntryApiClient(request, pollingStationId, entryNumber);
    await dataEntry.claim();
    await dataEntry.save(noRecountNoDifferencesRequest);
    await dataEntry.finalise();
  }
}

async function completePollingStationDataEntriesWithDifferences(request: APIRequestContext, pollingStationId: number) {
  await loginAs(request, "typist");
  const firstDataEntry = new DataEntryApiClient(request, pollingStationId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(noRecountNoDifferencesRequest);
  await firstDataEntry.finalise();

  await loginAs(request, "typist2");
  const secondDataEntry = new DataEntryApiClient(request, pollingStationId, 2);
  await secondDataEntry.claim();
  const cloneDataEntry = JSON.parse(JSON.stringify(noRecountNoDifferencesRequest)) as DataEntry;
  cloneDataEntry.data.political_group_votes[0]!.candidate_votes[0]!.votes -= 10;
  cloneDataEntry.data.political_group_votes[0]!.candidate_votes[1]!.votes += 10;
  await secondDataEntry.save(cloneDataEntry);
  await secondDataEntry.finalise();
}

export const test = base.extend<Fixtures>({
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
    await loginAs(request, "typist");

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await use(pollingStation);
  },
  emptyElection: async ({ request }, use) => {
    await loginAs(request, "admin");
    // overide the current storage state
    // create an election with no polling stations
    const url: ELECTION_CREATE_REQUEST_PATH = `/api/elections`;
    const electionResponse = await request.post(url, { data: electionRequest });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  election: async ({ request, emptyElection }, use) => {
    await loginAs(request, "admin");
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
    await loginAs(request, "admin");
    // get the first polling station of the existing election
    const url: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${election.election.id}/polling_stations/${election.polling_stations[0]?.id ?? 0}`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const pollingStation = (await response.json()) as PollingStation;

    await use(pollingStation);
  },
  pollingStationFirstEntryDone: async ({ request, pollingStation }, use) => {
    await loginAs(request, "typist");

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(noRecountNoDifferencesRequest);
    await firstDataEntry.finalise();

    await use(pollingStation);
  },
  pollingStationDefinitive: async ({ request, pollingStation }, use) => {
    await completePollingStationDataEntries(request, pollingStation.id);

    await use(pollingStation);
  },
  pollingStationEntriesDifferent: async ({ request, pollingStation }, use) => {
    await completePollingStationDataEntriesWithDifferences(request, pollingStation.id);
    await use(pollingStation);
  },
  completedElection: async ({ request, election }, use) => {
    // finalise both data entries for all polling stations
    for (const pollingStationId of election.polling_stations.map((ps) => ps.id)) {
      await completePollingStationDataEntries(request, pollingStationId);
    }

    await use(election.election);
  },
  user: async ({ request }, use) => {
    await loginAs(request, "admin");
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
