import { readFile } from "node:fs/promises";
import { type APIRequestContext, test as base, expect, type Page } from "@playwright/test";
import { DataEntryApiClient } from "e2e-tests/helpers-utils/api-clients";
import { completeDataEntries } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import { createRandomUsername } from "e2e-tests/helpers-utils/e2e-test-utils";
import { type Eml230b, eml110a, eml230b, eml230b_more_than_45_candidates } from "e2e-tests/test-data/eml-files";
import {
  dataEntryRequest,
  dataEntryRequestGSB,
  dataEntryRequestGSBTriggeringDrawingLots,
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
  ELECTION_STATUS_REQUEST_PATH,
  Election,
  ElectionDetailsResponse,
  ElectionStatusResponse,
  POLLING_STATION_CREATE_REQUEST_PATH,
  USER_CREATE_REQUEST_BODY,
  USER_CREATE_REQUEST_PATH,
  User,
} from "@/types/generated/openapi";

export const FIXTURE_TYPIST_TEMP_PASSWORD: string = "temp_password_9876";

export interface DataEntry {
  election_id: number;
  id: number;
  name: string;
  number: string;
}

// Regular fixtures need to be passed into the test's arguments.
type Fixtures = {
  // page and request fixture for admin
  adminOne: { page: Page; request: APIRequestContext };
  // page and request fixture for GSB coordinator
  coordinatorOneGSB: { page: Page; request: APIRequestContext };
  // page and request fixture for GSB typist one
  typistOneGSB: { page: Page; request: APIRequestContext };
  // page and request fixture for GSB typist two
  typistTwoGSB: { page: Page; request: APIRequestContext };
  // page and request fixture for CSB coordinator
  coordinatorOneCSB: { page: Page; request: APIRequestContext };
  // page and request fixture for CSB typist one
  typistOneCSB: { page: Page; request: APIRequestContext };
  // page and request fixture for CSB typist two
  typistTwoCSB: { page: Page; request: APIRequestContext };
  eml230b: Eml230b;
  eml230b_more_than_45_candidates: Eml230b;
  // GSB election without polling stations
  emptyElectionGSB: Election;
  // CSB election
  emptyElectionCSB: Election;
  // GSB election with two polling stations
  electionGSB: ElectionDetailsResponse;
  // CSB election with one subcommittee
  electionCSB: ElectionDetailsResponse;
  // First data entry of the GSB election
  dataEntryGSB: DataEntry;
  // First data entry of the GSB election with entry claimed by typist one
  dataEntryGSBFirstEntryClaimed: DataEntry;
  // First data entry of the GSB election with first data entry done
  dataEntryGSBFirstEntryDone: DataEntry;
  // First data entry of the GSB election with first data entry with errors
  dataEntryGSBFirstEntryHasErrors: DataEntry;
  // First data entry of the GSB election with first and second data entries done
  dataEntryGSBDefinitive: DataEntry;
  // First data entry of the GSB election with differences between the first and second data entry
  dataEntryGSBEntriesDifferent: DataEntry;
  // First data entry of the GSB election with second data entry that has errors and is therefore different
  dataEntryGSBEntriesDifferentWithErrors: DataEntry;
  // GSB election with polling stations and two completed data entries for each
  completedElectionGSB: Election;
  // CSB election with subcommittee and two completed data entries
  completedElectionCSB: Election;
  // CSB election with subcommittee and two completed data entries that triggers drawing lots for lists and candidates
  completedElectionCSBWithDrawingLots: Election;
  // The current committee session for the GSB election
  currentCommitteeSessionElectionGSB: CommitteeSession;
  // Newly created GSB User
  newTypistGSB: User;
};

export const test = base.extend<Fixtures>({
  adminOne: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/admin1.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  coordinatorOneGSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/coordinator1-GSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistOneGSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist1-GSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistTwoGSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist2-GSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  coordinatorOneCSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/coordinator1-CSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistOneCSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist1-CSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  typistTwoCSB: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e-tests/state/typist2-CSB.json" });
    const page = await context.newPage();
    await use({ page: page, request: context.request });
    await context.close();
  },
  eml230b: [eml230b, { option: true }],
  eml230b_more_than_45_candidates: [eml230b_more_than_45_candidates, { option: true }],
  emptyElectionGSB: async ({ adminOne, eml230b }, use) => {
    const { request } = adminOne;
    const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
    const election_data = await readFile(eml110a.path, "utf8");
    const candidate_data = await readFile(eml230b.path, "utf8");
    const electionResponse = await request.post(url, {
      data: {
        committee_category: "GSB",
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
  emptyElectionCSB: async ({ adminOne, eml230b_more_than_45_candidates }, use) => {
    const { request } = adminOne;
    const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
    const election_data = await readFile(eml110a.path, "utf8");
    const candidate_data = await readFile(eml230b_more_than_45_candidates.path, "utf8");
    const electionResponse = await request.post(url, {
      data: {
        committee_category: "CSB",
        election_data,
        election_hash: eml110a.fullHash,
        candidate_data,
        candidate_hash: eml230b_more_than_45_candidates.fullHash,
      },
    });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  electionGSB: async ({ adminOne, coordinatorOneGSB, emptyElectionGSB }, use) => {
    // create polling stations in the existing emptyElection
    const url: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${emptyElectionGSB.id}/polling_stations`;
    for (const pollingStationRequest of pollingStationRequests) {
      const pollingStationResponse = await adminOne.request.post(url, { data: pollingStationRequest });
      expect(pollingStationResponse.ok()).toBeTruthy();
    }

    // get election details
    const electionUrl: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${emptyElectionGSB.id}`;
    const electionResponse = await adminOne.request.get(electionUrl);
    expect(electionResponse.ok()).toBeTruthy();
    const response = (await electionResponse.json()) as ElectionDetailsResponse;

    // Set committee session status to DataEntry
    const statusChangeUrl: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${response.current_committee_session.election_id}/committee_sessions/${response.current_committee_session.id}/status`;
    const statusChangeData: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry" };
    const statusChangeResponse = await coordinatorOneGSB.request.put(statusChangeUrl, { data: statusChangeData });
    expect(statusChangeResponse.ok()).toBeTruthy();

    // Fill in committee session details
    const detailsUpdateUrl: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/elections/${response.current_committee_session.election_id}/committee_sessions/${response.current_committee_session.id}`;
    const detailsUpdateData: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:45",
    };
    const detailsUpdateResponse = await coordinatorOneGSB.request.put(detailsUpdateUrl, { data: detailsUpdateData });
    expect(detailsUpdateResponse.ok()).toBeTruthy();

    await use(response);
  },
  electionCSB: async ({ adminOne, coordinatorOneCSB, emptyElectionCSB }, use) => {
    // get election details
    const electionUrl: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${emptyElectionCSB.id}`;
    const electionResponse = await adminOne.request.get(electionUrl);
    expect(electionResponse.ok()).toBeTruthy();
    const response = (await electionResponse.json()) as ElectionDetailsResponse;

    // Set committee session status to DataEntry
    const statusChangeUrl: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${response.current_committee_session.election_id}/committee_sessions/${response.current_committee_session.id}/status`;
    const statusChangeData: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry" };
    const statusChangeResponse = await coordinatorOneCSB.request.put(statusChangeUrl, { data: statusChangeData });
    expect(statusChangeResponse.ok()).toBeTruthy();

    // Fill in committee session details
    const detailsUpdateUrl: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/elections/${response.current_committee_session.election_id}/committee_sessions/${response.current_committee_session.id}`;
    const detailsUpdateData: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:45",
    };
    const detailsUpdateResponse = await coordinatorOneCSB.request.put(detailsUpdateUrl, { data: detailsUpdateData });
    expect(detailsUpdateResponse.ok()).toBeTruthy();

    await use(response);
  },
  dataEntryGSB: async ({ adminOne, electionGSB }, use) => {
    const { request } = adminOne;
    // get the first polling station of the existing election
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionGSB.election.id}/status`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const electionStatuses = (await response.json()) as ElectionStatusResponse;
    const electionStatus = electionStatuses.statuses[0]!;

    await use({
      election_id: electionGSB.election.id,
      id: electionStatus.data_entry_id,
      name: electionStatus.source.name,
      number: electionStatus.source.number.toString(),
    });
  },
  dataEntryGSBFirstEntryClaimed: async ({ typistOneGSB, dataEntryGSB }, use) => {
    const { request } = typistOneGSB;
    const firstDataEntry = new DataEntryApiClient(request, dataEntryGSB.id, 1);
    await firstDataEntry.claim();
    await use(dataEntryGSB);
  },
  dataEntryGSBFirstEntryDone: async ({ dataEntryGSB, typistOneGSB }, use) => {
    const { request } = typistOneGSB;
    const firstDataEntry = new DataEntryApiClient(request, dataEntryGSB.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(dataEntryRequest);
    await firstDataEntry.finalise();

    await use(dataEntryGSB);
  },
  dataEntryGSBFirstEntryHasErrors: async ({ dataEntryGSB, typistOneGSB }, use) => {
    const { request } = typistOneGSB;
    const firstDataEntry = new DataEntryApiClient(request, dataEntryGSB.id, 1);
    await firstDataEntry.claim();
    await firstDataEntry.save(dataEntryWithErrorRequest);
    await firstDataEntry.finalise();

    await use(dataEntryGSB);
  },
  dataEntryGSBDefinitive: async ({ dataEntryGSB, typistOneGSB, typistTwoGSB }, use) => {
    await completeDataEntries(dataEntryGSB.id, typistOneGSB.request, typistTwoGSB.request);

    await use(dataEntryGSB);
  },
  dataEntryGSBEntriesDifferent: async ({ dataEntryGSB, typistOneGSB, typistTwoGSB }, use) => {
    await completeDataEntries(
      dataEntryGSB.id,
      typistOneGSB.request,
      typistTwoGSB.request,
      dataEntryRequest,
      dataEntryWithDifferencesRequest,
    );

    await use(dataEntryGSB);
  },
  dataEntryGSBEntriesDifferentWithErrors: async ({ dataEntryGSB, typistOneGSB, typistTwoGSB }, use) => {
    await completeDataEntries(
      dataEntryGSB.id,
      typistOneGSB.request,
      typistTwoGSB.request,
      dataEntryRequest,
      dataEntryWithErrorRequest,
    );

    await use(dataEntryGSB);
  },
  completedElectionGSB: async ({ electionGSB, typistOneGSB, typistTwoGSB }, use) => {
    // finalise both data entries for all polling stations
    for (const ps of electionGSB.polling_stations) {
      await completeDataEntries(ps.data_entry_id!, typistOneGSB.request, typistTwoGSB.request);
    }

    await use(electionGSB.election);
  },
  completedElectionCSB: async ({ electionCSB, typistOneCSB, typistTwoCSB }, use) => {
    const { request } = typistOneCSB;
    // get the existing election statuses
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionCSB.election.id}/status`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const electionStatus = (await response.json()) as ElectionStatusResponse;
    const dataEntryId = electionStatus.statuses[0]!.data_entry_id;

    // finalise both data entries for the subcommittee
    await completeDataEntries(
      dataEntryId,
      typistOneCSB.request,
      typistTwoCSB.request,
      dataEntryRequestGSB,
      dataEntryRequestGSB,
    );

    await use(electionCSB.election);
  },
  completedElectionCSBWithDrawingLots: async ({ electionCSB, typistOneCSB, typistTwoCSB }, use) => {
    const { request } = typistOneCSB;
    // get the existing election statuses
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionCSB.election.id}/status`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const electionStatus = (await response.json()) as ElectionStatusResponse;
    const dataEntryId = electionStatus.statuses[0]!.data_entry_id;

    // finalise both data entries for the subcommittee
    await completeDataEntries(
      dataEntryId,
      typistOneCSB.request,
      typistTwoCSB.request,
      dataEntryRequestGSBTriggeringDrawingLots,
      dataEntryRequestGSBTriggeringDrawingLots,
    );

    await use(electionCSB.election);
  },
  currentCommitteeSessionElectionGSB: async ({ electionGSB }, use) => {
    await use(electionGSB.current_committee_session);
  },
  newTypistGSB: async ({ adminOne }, use) => {
    const { request } = adminOne;
    // create a new user
    const url: USER_CREATE_REQUEST_PATH = "/api/users";
    const data: USER_CREATE_REQUEST_BODY = {
      role: "typist_gsb",
      username: createRandomUsername(),
      fullname: "Gebruiker met Achternaam",
      temp_password: FIXTURE_TYPIST_TEMP_PASSWORD,
    };
    const userResponse = await request.post(url, { data });
    expect(userResponse.ok()).toBeTruthy();

    await use((await userResponse.json()) as User);
  },
});
