import { readFile } from "node:fs/promises";
import { type APIRequestContext, expect } from "@playwright/test";
import type { Eml110a, Eml230b } from "e2e-tests/test-data/eml-files";
import type {
  ELECTION_IMPORT_REQUEST_PATH,
  Election,
  ElectionCreationRequest,
  ElectionId,
  POLLING_STATION_CREATE_REQUEST_PATH,
  PollingStationRequest,
  VoteCountingMethod,
} from "@/types/generated/openapi";

export async function createGSBElection(
  admin: { request: APIRequestContext },
  election_eml: Eml110a,
  candidates_eml: Eml230b,
  counting_method: VoteCountingMethod,
): Promise<Election> {
  const requestBody: ElectionCreationRequest = {
    committee_category: "GSB",
    election_data: await readFile(election_eml.path, "utf8"),
    election_hash: election_eml.fullHash,
    candidate_data: await readFile(candidates_eml.path, "utf8"),
    candidate_hash: candidates_eml.fullHash,
    number_of_voters: 1234,
    counting_method: counting_method,
  };
  return await createElection(admin, requestBody);
}

export async function createCSBElection(
  admin: { request: APIRequestContext },
  election_eml: Eml110a,
  candidates_eml: Eml230b,
): Promise<Election> {
  const requestBody: ElectionCreationRequest = {
    committee_category: "CSB",
    election_data: await readFile(election_eml.path, "utf8"),
    election_hash: election_eml.fullHash,
    candidate_data: await readFile(candidates_eml.path, "utf8"),
    candidate_hash: candidates_eml.fullHash,
  };
  return await createElection(admin, requestBody);
}

async function createElection(
  admin: { request: APIRequestContext },
  requestBody: ElectionCreationRequest,
): Promise<Election> {
  const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const electionResponse = await admin.request.post(url, { data: requestBody });
  expect(electionResponse.ok()).toBeTruthy();
  const election = (await electionResponse.json()) as Election;
  return election;
}

export async function createPollingStations(
  user: { request: APIRequestContext },
  electionId: ElectionId,
  pollingStationRequests: PollingStationRequest[],
) {
  const url: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;
  for (const pollingStationRequest of pollingStationRequests) {
    const pollingStationResponse = await user.request.post(url, { data: pollingStationRequest });
    expect(pollingStationResponse.ok()).toBeTruthy();
  }
}
