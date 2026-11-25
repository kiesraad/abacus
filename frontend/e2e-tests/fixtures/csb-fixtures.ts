import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import {
  changeCommitteeSessionStatus,
  completeDataEntries,
} from "e2e-tests/helpers-utils/api-helpers/e2e-test-api-helpers";
import {
  type Eml230b,
  eml110a,
  eml110a_AB,
  eml110a_less_than_19_seats,
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
  ELECTION_IMPORT_REQUEST_PATH,
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
  // candidate list file (EML 230b) for a GR election
  eml230b_more_than_45_candidates: Eml230b;
  // CSB election with >= 19 seats
  emptyElectionCSBLargeCouncil: Election;
  // CSB election for Water Authority
  emptyElectionCSBWS: Election;
  // CSB election with < 19 seats
  emptyElectionCSBSmallCouncil: Election;
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
  eml230b_more_than_45_candidates: [eml230b_more_than_45_candidates, { option: true }],
  emptyElectionCSBLargeCouncil: async ({ adminOne, eml230b_more_than_45_candidates }, use) => {
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
  emptyElectionCSBSmallCouncil: async ({ adminOne, eml230b_more_than_45_candidates }, use) => {
    const { request } = adminOne;
    const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
    const election_data = await readFile(eml110a_less_than_19_seats.path, "utf8");
    const candidate_data = await readFile(eml230b_more_than_45_candidates.path, "utf8");
    const electionResponse = await request.post(url, {
      data: {
        committee_category: "CSB",
        election_data,
        election_hash: eml110a_less_than_19_seats.fullHash,
        candidate_data,
        candidate_hash: eml230b_more_than_45_candidates.fullHash,
      },
    });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  emptyElectionCSBWS: async ({ adminOne }, use) => {
    const { request } = adminOne;
    const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
    const election_data = await readFile(eml110a_AB.path, "utf8");
    const candidate_data = await readFile(eml230b_AB_more_than_45_candidates.path, "utf8");
    const electionResponse = await request.post(url, {
      data: {
        committee_category: "CSB",
        election_data,
        election_hash: eml110a_AB.fullHash,
        candidate_data,
        candidate_hash: eml230b_AB_more_than_45_candidates.fullHash,
      },
    });
    expect(electionResponse.ok()).toBeTruthy();
    const election = (await electionResponse.json()) as Election;

    await use(election);
  },
  electionCSBLargeCouncil: async ({ coordinatorOneCSB, emptyElectionCSBLargeCouncil }, use) => {
    const electionId = emptyElectionCSBLargeCouncil.id;

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
  electionCSBLargeCouncilWithSubCommitteeCertificate: async ({ adminOne, electionCSBLargeCouncil }, use) => {
    const electionId = electionCSBLargeCouncil.election.id;

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

    await use({ election: electionCSBLargeCouncil.election, subCommittee });
  },
  electionCSBSmallCouncil: async ({ coordinatorOneCSB, emptyElectionCSBSmallCouncil }, use) => {
    const electionId = emptyElectionCSBSmallCouncil.id;

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
