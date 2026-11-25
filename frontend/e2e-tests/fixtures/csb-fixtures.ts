import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { changeCommitteeSessionStatus } from "e2e-tests/helpers-utils/api-helpers/coordinator-api-helpers";
import { completeDataEntries } from "e2e-tests/helpers-utils/api-helpers/data-entry-api-helpers";
import { createCSBElection } from "e2e-tests/helpers-utils/api-helpers/election-api-helpers";
import {
  eml110a,
  eml110a_AB,
  eml110a_less_than_19_seats,
  eml230b,
  eml230b_AB_more_than_45_candidates,
  eml230b_more_than_45_candidates,
  eml510b,
} from "e2e-tests/test-data/eml-files";
import {
  dataEntryRequestGSB,
  dataEntryRequestGSBTriggeringDrawingLotsForListAndCandidate,
  dataEntryRequestGSBTriggeringDrawingLotsForP9,
} from "e2e-tests/test-data/request-response-templates";
import type {
  AddSubCommitteeCertificateResponse,
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY,
  COMMITTEE_SESSION_UPDATE_REQUEST_PATH,
  ELECTION_STATUS_REQUEST_PATH,
  Election,
  ElectionDetailsResponse,
  ElectionStatusResponse,
  SUB_COMMITTEE_CERTIFICATE_ADD_REQUEST_BODY,
  SUB_COMMITTEE_CERTIFICATE_ADD_REQUEST_PATH,
  SUB_COMMITTEE_CERTIFICATES_REQUEST_PATH,
  SubCommittee,
} from "@/types/generated/openapi";
import { userFixtures } from "./user-fixtures";

type CSBFixtures = {
  // CSB election for Water Authority
  emptyElectionCSBWS: Election;
  // CSB election with >= 19 seats and one subcommittee
  electionCSBLargeCouncil: ElectionDetailsResponse;
  // CSB election with >= 19 seats and one subcommittee with its certificate added.
  electionCSBLargeCouncilWithSubCommitteeCertificate: { election: Election; subCommittee: SubCommittee };
  // CSB election with < 19 seats and one subcommittee
  electionCSBSmallCouncil: ElectionDetailsResponse;
  // CSB election with >= 19 seats, one subcommittee and two completed data entries
  completedElectionCSB: Election;
  // CSB election with >= 19 seats, one subcommittee and two completed data entries that triggers drawing lots for lists and candidates
  completedElectionCSBWithDrawingLotsForListAndCandidate: Election;
  // CSB election with < 19 seats, one subcommittee and two completed data entries that triggers drawing lots for P 9
  completedElectionCSBWithDrawingLotsForP9: Election;
};

export const csbFixtures = userFixtures.extend<CSBFixtures>({
  emptyElectionCSBWS: async ({ adminOne }, use) => {
    const election = await createCSBElection(adminOne, eml110a_AB, eml230b_AB_more_than_45_candidates);
    await use(election);
  },
  electionCSBLargeCouncil: async ({ adminOne, coordinatorOneCSB }, use) => {
    const election = await createCSBElection(adminOne, eml110a, eml230b_more_than_45_candidates);
    const electionId = election.id;

    // Set committee session status to DataEntry
    const electionDetails = await changeCommitteeSessionStatus(coordinatorOneCSB, electionId, "data_entry");

    // Fill in committee session details
    const detailsUpdateUrl: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions/${electionDetails.current_committee_session.id}`;
    const detailsUpdateData: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:45",
    };
    const detailsUpdateResponse = await coordinatorOneCSB.request.put(detailsUpdateUrl, { data: detailsUpdateData });
    expect(detailsUpdateResponse.ok()).toBeTruthy();

    await use(electionDetails);
  },
  electionCSBLargeCouncilWithSubCommitteeCertificate: async ({ adminOne, coordinatorOneCSB }, use) => {
    const election = await createCSBElection(adminOne, eml110a, eml230b);
    const electionId = election.id;

    // Set committee session status to DataEntry
    const electionDetails = await changeCommitteeSessionStatus(coordinatorOneCSB, electionId, "data_entry");

    // Fill in committee session details
    const detailsUpdateUrl: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions/${electionDetails.current_committee_session.id}`;
    const detailsUpdateData: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:45",
    };
    const detailsUpdateResponse = await coordinatorOneCSB.request.put(detailsUpdateUrl, { data: detailsUpdateData });
    expect(detailsUpdateResponse.ok()).toBeTruthy();

    // Admin: add the certificate of the sub committee.
    const certificate = await readFile(eml510b.certificatePath, "utf8");
    const certificateAddUrl: SUB_COMMITTEE_CERTIFICATE_ADD_REQUEST_PATH = `/api/elections/${electionId}/sub_committee_certificates`;
    const certificateAddBody: SUB_COMMITTEE_CERTIFICATE_ADD_REQUEST_BODY = { data: certificate };
    const certificateAddResponse = await adminOne.request.post(certificateAddUrl, { data: certificateAddBody });
    expect(certificateAddResponse.status()).toBe(201);

    const addedCertificate = (await certificateAddResponse.json()) as AddSubCommitteeCertificateResponse;

    // Retrieve the sub committee that the certificate was added to.
    const subCommitteesUrl: SUB_COMMITTEE_CERTIFICATES_REQUEST_PATH = `/api/elections/${electionId}/sub_committee_certificates`;
    const subCommitteesRes = await adminOne.request.get(subCommitteesUrl);
    expect(subCommitteesRes.ok()).toBeTruthy();
    const subCommittees = (await subCommitteesRes.json()) as SubCommittee[];
    const subCommittee = subCommittees.find(({ id }) => id === addedCertificate.sub_committee_id);
    if (!subCommittee) throw new Error(`Sub committee ${addedCertificate.sub_committee_id} not found.`);

    await use({ election: election, subCommittee });
  },
  electionCSBSmallCouncil: async ({ adminOne, coordinatorOneCSB }, use) => {
    const election = await createCSBElection(adminOne, eml110a_less_than_19_seats, eml230b_more_than_45_candidates);
    const electionId = election.id;

    // Set committee session status to DataEntry
    const electionDetails = await changeCommitteeSessionStatus(coordinatorOneCSB, electionId, "data_entry");

    // Fill in committee session details
    const detailsUpdateUrl: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions/${electionDetails.current_committee_session.id}`;
    const detailsUpdateData: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:45",
    };
    const detailsUpdateResponse = await coordinatorOneCSB.request.put(detailsUpdateUrl, { data: detailsUpdateData });
    expect(detailsUpdateResponse.ok()).toBeTruthy();

    await use(electionDetails);
  },

  completedElectionCSB: async ({ electionCSBLargeCouncil, typistOneCSB, typistTwoCSB }, use) => {
    const { request } = typistOneCSB;
    // get the existing election statuses
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionCSBLargeCouncil.election.id}/status`;
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

    await use(electionCSBLargeCouncil.election);
  },
  completedElectionCSBWithDrawingLotsForListAndCandidate: async (
    { electionCSBLargeCouncil, typistOneCSB, typistTwoCSB },
    use,
  ) => {
    const { request } = typistOneCSB;
    // get the existing election statuses
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionCSBLargeCouncil.election.id}/status`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const electionStatus = (await response.json()) as ElectionStatusResponse;
    const dataEntryId = electionStatus.statuses[0]!.data_entry_id;

    // finalise both data entries for the subcommittee
    await completeDataEntries(
      dataEntryId,
      typistOneCSB.request,
      typistTwoCSB.request,
      dataEntryRequestGSBTriggeringDrawingLotsForListAndCandidate,
      dataEntryRequestGSBTriggeringDrawingLotsForListAndCandidate,
    );

    await use(electionCSBLargeCouncil.election);
  },
  completedElectionCSBWithDrawingLotsForP9: async ({ electionCSBSmallCouncil, typistOneCSB, typistTwoCSB }, use) => {
    const { request } = typistOneCSB;
    // get the existing election statuses
    const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionCSBSmallCouncil.election.id}/status`;
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const electionStatus = (await response.json()) as ElectionStatusResponse;
    const dataEntryId = electionStatus.statuses[0]!.data_entry_id;

    // finalise both data entries for the subcommittee
    await completeDataEntries(
      dataEntryId,
      typistOneCSB.request,
      typistTwoCSB.request,
      dataEntryRequestGSBTriggeringDrawingLotsForP9,
      dataEntryRequestGSBTriggeringDrawingLotsForP9,
    );

    await use(electionCSBSmallCouncil.election);
  },
});
