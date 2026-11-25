import { type APIRequestContext, expect } from "@playwright/test";
import type {
  COMMITTEE_SESSION_CREATE_REQUEST_PATH,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  CommitteeSessionStatus,
  DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH,
  DataEntryId,
  ELECTION_DETAILS_REQUEST_PATH,
  ElectionDetailsResponse,
  ElectionId,
  POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_BODY,
  POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_PATH,
  POLLING_STATION_INVESTIGATION_CREATE_REQUEST_BODY,
  POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PATH,
  PollingStationId,
  PollingStationInvestigation,
  ResolveDifferencesAction,
} from "@/types/generated/openapi";

export async function resolveDifferences(
  coordinator: { request: APIRequestContext },
  dataEntryId: DataEntryId,
  action: ResolveDifferencesAction,
): Promise<number> {
  const url: DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH = `/api/data_entries/${dataEntryId}/resolve_differences`;
  const data: DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY = action;
  const response = await coordinator.request.post(url, { data, headers: { "content-type": "application/json" } });
  expect(response.ok(), `Unexpected response: ${response.statusText()}`).toBeTruthy();
  return response.status();
}

async function getElectionDetails(user: { request: APIRequestContext }, electionId: ElectionId) {
  const electionUrl: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  const electionResponse = await user.request.get(electionUrl);
  expect(electionResponse.ok()).toBeTruthy();
  return (await electionResponse.json()) as ElectionDetailsResponse;
}

/**
 * Change the election's current committee session status and return the election details.
 */
export async function changeCommitteeSessionStatus(
  user: { request: APIRequestContext },
  electionId: ElectionId,
  status: CommitteeSessionStatus,
) {
  const electionDetails = await getElectionDetails(user, electionId);

  const statusChangeUrl: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions/${electionDetails.current_committee_session.id}/status`;
  const statusChangeData: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status };
  const statusChangeResponse = await user.request.put(statusChangeUrl, { data: statusChangeData });
  expect(statusChangeResponse.ok()).toBeTruthy();

  return electionDetails;
}

/**
 * Create a new committee session and return election details.
 */
export async function createCommitteeSession(user: { request: APIRequestContext }, electionId: ElectionId) {
  const createSessionUrl: COMMITTEE_SESSION_CREATE_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions`;
  const createSessionResponse = await user.request.post(createSessionUrl);
  expect(createSessionResponse.ok()).toBeTruthy();

  return await getElectionDetails(user, electionId);
}

/**
 * Create and conclude an investigation with corrected results.
 */
export async function createInvestigation(user: { request: APIRequestContext }, pollingStationId: PollingStationId) {
  const createUrl: POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/investigation`;
  const createData: POLLING_STATION_INVESTIGATION_CREATE_REQUEST_BODY = { reason: "Een aanleiding" };
  const createResponse = await user.request.post(createUrl, { data: createData });
  expect(createResponse.ok()).toBeTruthy();

  const concludeUrl: POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_PATH = `${createUrl}/conclude`;
  const concludeData: POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_BODY = {
    findings: "Foutje bedankt",
    corrected_results: true,
  };
  const concludeResponse = await user.request.post(concludeUrl, { data: concludeData });
  expect(concludeResponse.ok()).toBeTruthy();
  return (await concludeResponse.json()) as PollingStationInvestigation;
}
