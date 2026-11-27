import { expect } from "@playwright/test";
import {
  changeCommitteeSessionStatus,
  createCommitteeSession,
  createInvestigation,
  fillInCommiteeSessionDetails,
  resolveDifferences,
} from "e2e-tests/helpers-utils/api-helpers/coordinator-api-helpers";
import { completeDataEntries, DataEntryApiClient } from "e2e-tests/helpers-utils/api-helpers/data-entry-api-helpers";
import { createGSBElection, createPollingStations } from "e2e-tests/helpers-utils/api-helpers/election-api-helpers";
import { type Eml230b, eml110a, eml230b } from "e2e-tests/test-data/eml-files";
import {
  dataEntryRequest,
  dataEntryWithDifferencesRequest,
  dataEntryWithErrorRequest,
  nextSessionResults,
  nextSessionResultsWithDifferences,
  pollingStationRequests,
} from "e2e-tests/test-data/request-response-templates";
import type {
  ELECTION_STATUS_REQUEST_PATH,
  Election,
  ElectionDetailsResponse,
  ElectionStatusResponse,
} from "@/types/generated/openapi";
import { userFixtures } from "./user-fixtures";

export interface DataEntryFixture {
  election_id: number;
  id: number;
  name: string;
  number: string;
}

type GSBFixtures = {
  // candidate list file (EML 230b) for a GR election
  eml230b: Eml230b;
  // GSB CSO election without polling stations
  emptyElectionGSB: Election;
  // GSB CSO election with two polling stations
  electionGSB: ElectionDetailsResponse;
  // GSB DSO election with two polling stations
  electionGSBDSO: ElectionDetailsResponse;
  // First data entry of the GSB CSO election
  dataEntryGSB: DataEntryFixture;
  // First data entry of the GSB DSO election
  dataEntryGSBDSO: DataEntryFixture;
  // First data entry of the GSB CSO election with entry claimed by typist one
  dataEntryGSBFirstEntryClaimed: DataEntryFixture;
  // First data entry of the GSB CSO election with first data entry done
  dataEntryGSBFirstEntryDone: DataEntryFixture;
  // First data entry correction of the GSB CSO election after resolve differences
  dataEntryGSBFirstEntryCorrection: DataEntryFixture;
  // First data entry correction of the next session of a GSB CSO election after resolve differences
  dataEntryNextSessionFirstEntryCorrection: DataEntryFixture;
  // Second data entry correction of the GSB CSO election after resolve differences
  dataEntryGSBSecondEntryCorrection: DataEntryFixture;
  // First data entry of the GSB CSO election with first data entry with errors
  dataEntryGSBFirstEntryHasErrors: DataEntryFixture;
  // First data entry of the GSB CSO election with first and second data entries done
  dataEntryGSBDefinitive: DataEntryFixture;
  // First data entry of the GSB CSO election with differences between the first and second data entry
  dataEntryGSBEntriesDifferent: DataEntryFixture;
  // First data entry of the GSB CSO election with second data entry that has errors and is therefore different
  dataEntryGSBEntriesDifferentWithErrors: DataEntryFixture;
  // GSB CSO election with polling stations and two completed data entries for each
  completedElectionGSB: ElectionDetailsResponse;
  // GSB CSO election with one investigation in the second committee session
  dataEntryNextSession: DataEntryFixture;
};

export const gsbFixtures = userFixtures.extend<GSBFixtures>({
  eml230b: [eml230b, { option: true }],
  emptyElectionGSB: async ({ adminOne }, use) => {
    const election = await createGSBElection(adminOne, eml110a, eml230b, "CSO");
    await use(election);
  },
  electionGSB: async ({ adminOne, coordinatorOneGSB }, use) => {
    const election = await createGSBElection(adminOne, eml110a, eml230b, "CSO");

    await createPollingStations(adminOne, election.id, pollingStationRequests);

    // Set committee session status to DataEntry
    const electionDetails = await changeCommitteeSessionStatus(coordinatorOneGSB, election.id, "data_entry");

    await fillInCommiteeSessionDetails(coordinatorOneGSB, election.id, electionDetails.current_committee_session.id);

    await use(electionDetails);
  },
  electionGSBDSO: async ({ adminOne, coordinatorOneGSB }, use) => {
    const election = await createGSBElection(adminOne, eml110a, eml230b, "DSO");

    await createPollingStations(adminOne, election.id, pollingStationRequests);

    // Set committee session status to DataEntry
    const electionDetails = await changeCommitteeSessionStatus(coordinatorOneGSB, election.id, "data_entry");

    await fillInCommiteeSessionDetails(coordinatorOneGSB, election.id, electionDetails.current_committee_session.id);

    await use(electionDetails);
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
  dataEntryGSBDSO: async ({ adminOne, electionGSBDSO }, use) => {
    const { request } = adminOne;
    // get the first polling station of the existing election
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionGSBDSO.election.id}/status`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const electionStatuses = (await response.json()) as ElectionStatusResponse;
    const electionStatus = electionStatuses.statuses[0]!;

    await use({
      election_id: electionGSBDSO.election.id,
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
  dataEntryGSBFirstEntryCorrection: async ({ coordinatorOneGSB, dataEntryGSBEntriesDifferent }, use) => {
    await resolveDifferences(coordinatorOneGSB, dataEntryGSBEntriesDifferent.id, "keep_second_and_correct_first");
    await use(dataEntryGSBEntriesDifferent);
  },
  dataEntryNextSessionFirstEntryCorrection: async (
    { typistOneGSB, typistTwoGSB, coordinatorOneGSB, dataEntryNextSession },
    use,
  ) => {
    await completeDataEntries(
      dataEntryNextSession.id,
      typistOneGSB.request,
      typistTwoGSB.request,
      { data: nextSessionResults, progress: 100, client_state: {} },
      { data: nextSessionResultsWithDifferences, progress: 100, client_state: {} },
    );

    await resolveDifferences(coordinatorOneGSB, dataEntryNextSession.id, "keep_second_and_correct_first");
    await use(dataEntryNextSession);
  },
  dataEntryGSBSecondEntryCorrection: async ({ coordinatorOneGSB, dataEntryGSBEntriesDifferent }, use) => {
    await resolveDifferences(coordinatorOneGSB, dataEntryGSBEntriesDifferent.id, "keep_first_and_correct_second");
    await use(dataEntryGSBEntriesDifferent);
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

    await use(electionGSB);
  },
  dataEntryNextSession: async ({ coordinatorOneGSB, completedElectionGSB }, use) => {
    const election = completedElectionGSB.election;
    await changeCommitteeSessionStatus(coordinatorOneGSB, election.id, "completed");
    const electionDetails = await createCommitteeSession(coordinatorOneGSB, election.id);

    const pollingStation = electionDetails.polling_stations[0]!;
    const investigation = await createInvestigation(coordinatorOneGSB, pollingStation.id);

    await use({
      election_id: election.id,
      id: investigation.data_entry_id!,
      name: pollingStation.name,
      number: String(pollingStation.number),
    });
  },
});
