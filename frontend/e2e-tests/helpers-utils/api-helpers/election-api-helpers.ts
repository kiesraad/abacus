import { readFile } from "node:fs/promises";
import { type APIRequestContext, expect } from "@playwright/test";
import type { Eml110a, Eml230b } from "e2e-tests/test-data/eml-files";
import type { ELECTION_IMPORT_REQUEST_PATH, Election, VoteCountingMethod } from "@/types/generated/openapi";

export async function createGSBElection(
  admin: { request: APIRequestContext },
  election_eml: Eml110a,
  candidates_eml: Eml230b,
  counting_method: VoteCountingMethod,
): Promise<Election> {
  const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const election_data = await readFile(election_eml.path, "utf8");
  const candidate_data = await readFile(candidates_eml.path, "utf8");
  const electionResponse = await admin.request.post(url, {
    data: {
      committee_category: "GSB",
      election_data,
      election_hash: election_eml.fullHash,
      candidate_data,
      candidate_hash: candidates_eml.fullHash,
      number_of_voters: 1234,
      counting_method: counting_method,
    },
  });
  expect(electionResponse.ok()).toBeTruthy();
  const election = (await electionResponse.json()) as Election;
  return election;
}

export async function createCSBElection(
  admin: { request: APIRequestContext },
  election_eml: Eml110a,
  candidates_eml: Eml230b,
): Promise<Election> {
  const url: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const election_data = await readFile(election_eml.path, "utf8");
  const candidate_data = await readFile(candidates_eml.path, "utf8");
  const electionResponse = await admin.request.post(url, {
    data: {
      committee_category: "CSB",
      election_data,
      election_hash: election_eml.fullHash,
      candidate_data,
      candidate_hash: candidates_eml.fullHash,
    },
  });
  expect(electionResponse.ok()).toBeTruthy();
  const election = (await electionResponse.json()) as Election;
  return election;
}
