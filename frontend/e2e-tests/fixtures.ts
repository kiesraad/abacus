import { readFile } from "node:fs/promises";
import { type APIRequestContext, test as base, expect, type Page } from "@playwright/test";
import { DataEntryApiClient } from "e2e-tests/helpers-utils/api-clients";
import { completePollingStationDataEntries } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import { createRandomUsername } from "e2e-tests/helpers-utils/e2e-test-utils";
import { type Eml230b, eml110a, eml230b } from "e2e-tests/test-data/eml-files";
import {
  dataEntryRequest,
  dataEntryWithDifferencesRequest,
  dataEntryWithErrorRequest,
  pollingStationRequests,
} from "e2e-tests/test-data/request-response-templates";
import type {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY,
  COMMITTEE_SESSION_UPDATE_REQUEST_PATH,
  CommitteeSession,
  ELECTION_DETAILS_REQUEST_PATH,
  ELECTION_IMPORT_REQUEST_PATH,
  Election,
  ElectionDetailsResponse,
  POLLING_STATION_CREATE_REQUEST_PATH,
  POLLING_STATION_GET_REQUEST_PATH,
  PollingStation,
  USER_CREATE_REQUEST_BODY,
  USER_CREATE_REQUEST_PATH,
  User,
} from "@/types/generated/openapi";

export const FIXTURE_TYPIST_TEMP_PASSWORD: string = "temp_password_9876";

// Regular fixtures need to be passed into the test's arguments.
type Fixtures = {
  // page and request fixture for admin
  admin: { page: Page; request: APIRequestContext };
  // page and request fixture for coordinator
  coordinator: { page: Page; request: APIRequestContext };
  // page and request fixture for typist one
  typistOne: { page: Page; request: APIRequestContext };
  // page and request fixture for typist two
  typistTwo: { page: Page; request: APIRequestContext };
  eml230b: Eml230b;
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
  // The current committee session for the election
  currentCommitteeSession: CommitteeSession;
  // Newly created User
  newTypist: User;
};

export const test = base.extend<Fixtures>({
  admin: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/admin1.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  coordinator: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/coordinator1.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistOne: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist1.json" });
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

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await use(pollingStation);
  },
  eml230b: [eml230b, { option: true }],
  emptyElection: async ({ admin, eml230b }, use) => {
    const { request } = admin;
    const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
    const election_data = await readFile(eml110a.path, "utf8");
    const candidate_data = await readFile(eml230b.path, "utf8");
    const electionResponse = await request.post(url, {
      data: {
        role: "GSB",
        election_data,
        election_hash: eml110a.fullHash,
        candidate_data,
        candidate_hash: eml230b.fullHash,
        number_of_voters: 1234,
        counting_method: "CSO",
      },
    });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  election: async ({ admin, coordinator, emptyElection }, use) => {
    // create polling stations in the existing emptyElection
    const url: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${emptyElection.id}/polling_stations`;
    for (const pollingStationRequest of pollingStationRequests) {
      const pollingStationResponse = await admin.request.post(url, { data: pollingStationRequest });
      expect(pollingStationResponse.ok()).toBeTruthy();
    }

    // get election details
    const electionUrl: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${emptyElection.id}`;
    const electionResponse = await admin.request.get(electionUrl);
    expect(electionResponse.ok()).toBeTruthy();
    const response = (await electionResponse.json()) as ElectionDetailsResponse;

    // Set committee session status to DataEntry
    const statusChangeUrl: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${response.current_committee_session.election_id}/committee_sessions/${response.current_committee_session.id}/status`;
    const statusChangeData: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry" };
    const statusChangeResponse = await coordinator.request.put(statusChangeUrl, { data: statusChangeData });
    expect(statusChangeResponse.ok()).toBeTruthy();

    // Fill in committee session details
    const detailsUpdateUrl: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/elections/${response.current_committee_session.election_id}/committee_sessions/${response.current_committee_session.id}`;
    const detailsUpdateData: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:45",
    };
    const detailsUpdateResponse = await coordinator.request.put(detailsUpdateUrl, { data: detailsUpdateData });
    expect(detailsUpdateResponse.ok()).toBeTruthy();

    await use(response);
  },
  pollingStation: async ({ admin, election }, use) => {
    const { request } = admin;
    // get the first polling station of the existing election
    const url: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${election.election.id}/polling_stations/${election.polling_stations[0]?.id ?? 0}`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const pollingStation = (await response.json()) as PollingStation;

    await use(pollingStation);
  },
  pollingStationFirstEntryDone: async ({ pollingStation, typistOne }, use) => {
    const { request } = typistOne;

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(dataEntryRequest);
    await firstDataEntry.finalise();

    await use(pollingStation);
  },
  pollingStationFirstEntryHasErrors: async ({ pollingStation, typistOne }, use) => {
    const { request } = typistOne;

    const firstDataEntry = new DataEntryApiClient(request, pollingStation.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(dataEntryWithErrorRequest);
    await firstDataEntry.finalise();

    await use(pollingStation);
  },
  pollingStationDefinitive: async ({ pollingStation, typistOne, typistTwo }, use) => {
    await completePollingStationDataEntries(pollingStation.id, typistOne.request, typistTwo.request);

    await use(pollingStation);
  },
  pollingStationEntriesDifferent: async ({ pollingStation, typistOne, typistTwo }, use) => {
    await completePollingStationDataEntries(
      pollingStation.id,
      typistOne.request,
      typistTwo.request,
      dataEntryRequest,
      dataEntryWithDifferencesRequest,
    );

    await use(pollingStation);
  },
  pollingStationEntriesDifferentWithErrors: async ({ pollingStation, typistOne, typistTwo }, use) => {
    await completePollingStationDataEntries(
      pollingStation.id,
      typistOne.request,
      typistTwo.request,
      dataEntryRequest,
      dataEntryWithErrorRequest,
    );

    await use(pollingStation);
  },
  completedElection: async ({ election, typistOne, typistTwo }, use) => {
    // finalise both data entries for all polling stations
    for (const pollingStationId of election.polling_stations.map((ps) => ps.id)) {
      await completePollingStationDataEntries(pollingStationId, typistOne.request, typistTwo.request);
    }

    await use(election.election);
  },
  currentCommitteeSession: async ({ election }, use) => {
    await use(election.current_committee_session);
  },
  newTypist: async ({ admin }, use) => {
    const { request } = admin;
    // create a new user
    const url: USER_CREATE_REQUEST_PATH = "/api/users";
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
