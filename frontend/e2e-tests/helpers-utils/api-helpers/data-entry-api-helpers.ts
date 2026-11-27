import { type APIRequestContext, expect } from "@playwright/test";
import { dataEntryRequest } from "e2e-tests/test-data/request-response-templates";
import type {
  DATA_ENTRY_CLAIM_REQUEST_PATH,
  DATA_ENTRY_FINALISE_REQUEST_PATH,
  DATA_ENTRY_SAVE_REQUEST_PATH,
  DataEntry,
  ELECTION_STATUS_REQUEST_PATH,
  ElectionId,
  ElectionStatusResponse,
} from "@/types/generated/openapi";

export async function getFirstDataEntryForElection(admin: { request: APIRequestContext }, electionId: ElectionId) {
  // get the first polling station of the existing election
  const url: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionId}/status`;
  const response = await admin.request.get(url);
  expect(response.ok()).toBeTruthy();
  const electionStatuses = (await response.json()) as ElectionStatusResponse;
  return electionStatuses.statuses[0]!;
}

export class DataEntryApiClient {
  private session: APIRequestContext;
  private readonly baseUrl: DATA_ENTRY_SAVE_REQUEST_PATH;

  public constructor(request: APIRequestContext, dataEntryId: number, entryNumber: number) {
    this.session = request;
    this.baseUrl = `/api/data_entries/${dataEntryId}/${entryNumber}`;
  }

  public async claim() {
    const claimUrl: DATA_ENTRY_CLAIM_REQUEST_PATH = `${this.baseUrl}/claim`;
    const claimResponse = await this.session.post(claimUrl);
    expect(claimResponse.ok()).toBeTruthy();
  }

  public async save(dataEntry: DataEntry) {
    const saveResponse = await this.session.post(this.baseUrl, { data: dataEntry });
    expect(saveResponse.ok()).toBeTruthy();
  }

  public async finalise() {
    const finaliseUrl: DATA_ENTRY_FINALISE_REQUEST_PATH = `${this.baseUrl}/finalise`;
    const finaliseResponse = await this.session.post(finaliseUrl);
    expect(finaliseResponse.ok()).toBeTruthy();
  }
}

export async function completeDataEntries(
  dataEntryId: number,
  typistOneRequest: APIRequestContext,
  typistTwoRequest: APIRequestContext,
  firstRequest = dataEntryRequest,
  secondRequest = dataEntryRequest,
) {
  const firstDataEntry = new DataEntryApiClient(typistOneRequest, dataEntryId, 1);
  await firstDataEntry.claim();
  await firstDataEntry.save(firstRequest);
  await firstDataEntry.finalise();

  const secondDataEntry = new DataEntryApiClient(typistTwoRequest, dataEntryId, 2);
  await secondDataEntry.claim();
  await secondDataEntry.save(secondRequest);
  await secondDataEntry.finalise();
}
