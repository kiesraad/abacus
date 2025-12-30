import { type HttpHandler, HttpResponse, http } from "msw";

import type {
  ACCOUNT_REQUEST_PARAMS,
  ACCOUNT_REQUEST_PATH,
  ACCOUNT_UPDATE_REQUEST_BODY,
  ACCOUNT_UPDATE_REQUEST_PARAMS,
  ACCOUNT_UPDATE_REQUEST_PATH,
  ADMIN_EXISTS_REQUEST_PARAMS,
  ADMIN_EXISTS_REQUEST_PATH,
  AUDIT_LOG_LIST_REQUEST_PARAMS,
  AUDIT_LOG_LIST_REQUEST_PATH,
  AUDIT_LOG_LIST_USERS_REQUEST_PARAMS,
  AUDIT_LOG_LIST_USERS_REQUEST_PATH,
  AuditLogListResponse,
  ClaimDataEntryResponse,
  COMMITTEE_SESSION_CREATE_REQUEST_PARAMS,
  COMMITTEE_SESSION_CREATE_REQUEST_PATH,
  COMMITTEE_SESSION_DELETE_REQUEST_PARAMS,
  COMMITTEE_SESSION_DELETE_REQUEST_PATH,
  COMMITTEE_SESSION_INVESTIGATIONS_REQUEST_PARAMS,
  COMMITTEE_SESSION_INVESTIGATIONS_REQUEST_PATH,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PARAMS,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY,
  COMMITTEE_SESSION_UPDATE_REQUEST_PARAMS,
  COMMITTEE_SESSION_UPDATE_REQUEST_PATH,
  CommitteeSession,
  CREATE_FIRST_ADMIN_REQUEST_BODY,
  CREATE_FIRST_ADMIN_REQUEST_PARAMS,
  CREATE_FIRST_ADMIN_REQUEST_PATH,
  DataEntryGetDifferencesResponse,
  DataEntryGetResponse,
  DataEntryStatusResponse,
  ELECTION_DETAILS_REQUEST_PARAMS,
  ELECTION_DETAILS_REQUEST_PATH,
  ELECTION_IMPORT_REQUEST_BODY,
  ELECTION_IMPORT_REQUEST_PARAMS,
  ELECTION_IMPORT_REQUEST_PATH,
  ELECTION_IMPORT_VALIDATE_REQUEST_BODY,
  ELECTION_IMPORT_VALIDATE_REQUEST_PARAMS,
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH,
  ELECTION_LIST_REQUEST_PARAMS,
  ELECTION_LIST_REQUEST_PATH,
  ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY,
  ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PARAMS,
  ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH,
  ELECTION_STATUS_REQUEST_PARAMS,
  ELECTION_STATUS_REQUEST_PATH,
  ElectionDefinitionValidateResponse,
  ElectionDetailsResponse,
  ElectionListResponse,
  ElectionStatusResponse,
  ElectionWithPoliticalGroups,
  ErrorResponse,
  INITIALISED_REQUEST_PARAMS,
  INITIALISED_REQUEST_PATH,
  InvestigationListResponse,
  LOGIN_REQUEST_BODY,
  LOGIN_REQUEST_PARAMS,
  LOGIN_REQUEST_PATH,
  LoginResponse,
  POLLING_STATION_CREATE_REQUEST_BODY,
  POLLING_STATION_CREATE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_GET_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_GET_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
  POLLING_STATION_DELETE_REQUEST_PARAMS,
  POLLING_STATION_DELETE_REQUEST_PATH,
  POLLING_STATION_GET_REQUEST_PARAMS,
  POLLING_STATION_GET_REQUEST_PATH,
  POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_BODY,
  POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_PARAMS,
  POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_PATH,
  POLLING_STATION_INVESTIGATION_CREATE_REQUEST_BODY,
  POLLING_STATION_INVESTIGATION_CREATE_REQUEST_PARAMS,
  POLLING_STATION_INVESTIGATION_CREATE_REQUEST_PATH,
  POLLING_STATION_INVESTIGATION_DELETE_REQUEST_PARAMS,
  POLLING_STATION_INVESTIGATION_DELETE_REQUEST_PATH,
  POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_BODY,
  POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PARAMS,
  POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PATH,
  POLLING_STATION_LIST_REQUEST_PARAMS,
  POLLING_STATION_LIST_REQUEST_PATH,
  POLLING_STATION_UPDATE_REQUEST_BODY,
  POLLING_STATION_UPDATE_REQUEST_PARAMS,
  POLLING_STATION_UPDATE_REQUEST_PATH,
  PollingStation,
  PollingStationInvestigation,
  PollingStationListResponse,
  SaveDataEntryResponse,
  USER_CREATE_REQUEST_BODY,
  USER_CREATE_REQUEST_PARAMS,
  USER_CREATE_REQUEST_PATH,
  USER_DELETE_REQUEST_PARAMS,
  USER_DELETE_REQUEST_PATH,
  USER_GET_REQUEST_PARAMS,
  USER_GET_REQUEST_PATH,
  USER_LIST_REQUEST_PARAMS,
  USER_LIST_REQUEST_PATH,
  USER_UPDATE_REQUEST_BODY,
  USER_UPDATE_REQUEST_PARAMS,
  USER_UPDATE_REQUEST_PATH,
  User,
  UserListResponse,
} from "@/types/generated/openapi";

import { getCommitteeSessionMockData } from "./CommitteeSessionMockData";
import {
  claimDataEntryResponse,
  dataEntryHasErrorsGetMockResponse,
  dataEntryStatusDifferences,
  saveDataEntryResponse,
} from "./DataEntryMockData";
import {
  electionDetailsMockResponse,
  electionImportMockResponse,
  electionImportValidateMockResponse,
  electionListMockResponse,
  investigationListMockResponse,
} from "./ElectionMockData";
import { statusResponseMock } from "./ElectionStatusMockData";
import { logMockResponse } from "./LogMockData";
import { pollingStationMockData } from "./PollingStationMockData";
import { loginResponseMockData, userMockData } from "./UserMockData";

type ParamsToString<T> = {
  [P in keyof T]: string;
};

type PingParams = Record<string, never>;
type PingRequestBody = {
  ping: string;
};
type PingResponseBody = {
  pong: string;
};

// ping handler for testing
export const pingHandler = http.post<PingParams, PingRequestBody, PingResponseBody>("/ping", async ({ request }) => {
  const data = await request.json();

  const pong = data.ping || "pong";

  return HttpResponse.json({
    pong,
  });
});

export const AccountRequestHandler = http.get<ACCOUNT_REQUEST_PARAMS, null, LoginResponse>(
  "/api/account" satisfies ACCOUNT_REQUEST_PATH,
  () =>
    HttpResponse.json(loginResponseMockData, {
      status: 200,
      headers: { "x-session-expires-at": new Date(Date.now() + 1000 * 60 * 30).toString() },
    }),
);

export const AccountUpdateRequestHandler = http.put<
  ACCOUNT_UPDATE_REQUEST_PARAMS,
  ACCOUNT_UPDATE_REQUEST_BODY,
  LoginResponse
>("/api/account" satisfies ACCOUNT_UPDATE_REQUEST_PATH, () =>
  HttpResponse.json(loginResponseMockData, { status: 200 }),
);

export const LogRequestHandler = http.get<ParamsToString<AUDIT_LOG_LIST_REQUEST_PARAMS>, null, AuditLogListResponse>(
  "/api/log" satisfies AUDIT_LOG_LIST_REQUEST_PATH,
  () => HttpResponse.json(logMockResponse, { status: 200 }),
);

export const LogUsersRequestHandler = http.get<ParamsToString<AUDIT_LOG_LIST_USERS_REQUEST_PARAMS>, null, User[]>(
  "/api/log-users" satisfies AUDIT_LOG_LIST_USERS_REQUEST_PATH,
  () => HttpResponse.json(userMockData, { status: 200 }),
);

// committee session status change handler
export const CommitteeSessionStatusChangeRequestHandler = http.put<
  ParamsToString<COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PARAMS>,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY
>("/api/elections/1/committee_sessions/1/status" satisfies COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH, () =>
  HttpResponse.json(null, { status: 200 }),
);

export const CommitteeSessionUpdateHandler = http.put<
  ParamsToString<COMMITTEE_SESSION_UPDATE_REQUEST_PARAMS>,
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY
>(
  "/api/elections/1/committee_sessions/1" satisfies COMMITTEE_SESSION_UPDATE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 200 }),
);

export const CommitteeSessionCreateHandler = http.post<
  ParamsToString<COMMITTEE_SESSION_CREATE_REQUEST_PARAMS>,
  null,
  CommitteeSession
>("/api/elections/1/committee_sessions" satisfies COMMITTEE_SESSION_CREATE_REQUEST_PATH, () => {
  const response: CommitteeSession = getCommitteeSessionMockData({ id: 2, number: 2, status: "created" });
  return HttpResponse.json(response, { status: 201 });
});

export const CommitteeSessionDeleteHandler = http.delete<ParamsToString<COMMITTEE_SESSION_DELETE_REQUEST_PARAMS>>(
  "/api/elections/1/committee_sessions/4" satisfies COMMITTEE_SESSION_DELETE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 200 }),
);

// get investigation list handler
export const InvestigationListRequestHandler = http.get<
  ParamsToString<COMMITTEE_SESSION_INVESTIGATIONS_REQUEST_PARAMS>,
  null,
  InvestigationListResponse
>("/api/elections/1/committee_sessions/1/investigations" satisfies COMMITTEE_SESSION_INVESTIGATIONS_REQUEST_PATH, () =>
  HttpResponse.json(investigationListMockResponse, { status: 200 }),
);

// investigation handlers
export const PollingStationInvestigationCreateHandler = http.post<
  ParamsToString<POLLING_STATION_INVESTIGATION_CREATE_REQUEST_PARAMS>,
  POLLING_STATION_INVESTIGATION_CREATE_REQUEST_BODY,
  PollingStationInvestigation
>("/api/polling_stations/3/investigation" satisfies POLLING_STATION_INVESTIGATION_CREATE_REQUEST_PATH, () => {
  const response: PollingStationInvestigation = {
    polling_station_id: 3,
    reason: "Test reason",
  };
  return HttpResponse.json(response, { status: 201 });
});

export const PollingStationInvestigationConcludeHandler = http.post<
  ParamsToString<POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_PARAMS>,
  POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_BODY,
  PollingStationInvestigation
>(
  "/api/polling_stations/3/investigation/conclude" satisfies POLLING_STATION_INVESTIGATION_CONCLUDE_REQUEST_PATH,
  () => {
    const response: PollingStationInvestigation = {
      polling_station_id: 3,
      reason: "Test reason",
      findings: "Test findings",
      corrected_results: true,
    };
    return HttpResponse.json(response, { status: 200 });
  },
);

export const PollingStationInvestigationUpdateHandler = http.put<
  ParamsToString<POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PARAMS>,
  POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_BODY,
  PollingStationInvestigation
>("/api/polling_stations/3/investigation" satisfies POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PATH, () => {
  const response: PollingStationInvestigation = {
    polling_station_id: 3,
    reason: "Test reason",
    findings: "Test findings",
    corrected_results: true,
  };
  return HttpResponse.json(response, { status: 200 });
});

export const PollingStationInvestigationDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_INVESTIGATION_DELETE_REQUEST_PARAMS>
>(
  "/api/polling_stations/3/investigation" satisfies POLLING_STATION_INVESTIGATION_DELETE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 204 }),
);

// get election list handler
export const ElectionListRequestHandler = http.get<
  ParamsToString<ELECTION_LIST_REQUEST_PARAMS>,
  null,
  ElectionListResponse
>("/api/elections" satisfies ELECTION_LIST_REQUEST_PATH, () =>
  HttpResponse.json(electionListMockResponse, { status: 200 }),
);

// get election details handler
export const ElectionRequestHandler = http.get<
  ParamsToString<ELECTION_DETAILS_REQUEST_PARAMS>,
  null,
  ElectionDetailsResponse | ErrorResponse
>("/api/elections/1" satisfies ELECTION_DETAILS_REQUEST_PATH, () =>
  HttpResponse.json(electionDetailsMockResponse, { status: 200 }),
);

// get election status handler
export const ElectionStatusRequestHandler = http.get<
  ParamsToString<ELECTION_STATUS_REQUEST_PARAMS>,
  null,
  ElectionStatusResponse
>("/api/elections/1/status" satisfies ELECTION_STATUS_REQUEST_PATH, () =>
  HttpResponse.json(statusResponseMock, { status: 200 }),
);

export const ElectionImportRequestHandler = http.post<
  ParamsToString<ELECTION_IMPORT_REQUEST_PARAMS>,
  ELECTION_IMPORT_REQUEST_BODY,
  ElectionWithPoliticalGroups
>("/api/elections/import" satisfies ELECTION_IMPORT_REQUEST_PATH, () =>
  HttpResponse.json(electionImportMockResponse, { status: 201 }),
);

export const ElectionImportValidateRequestHandler = http.post<
  ParamsToString<ELECTION_IMPORT_VALIDATE_REQUEST_PARAMS>,
  ELECTION_IMPORT_VALIDATE_REQUEST_BODY,
  ElectionDefinitionValidateResponse
>("/api/elections/import/validate" satisfies ELECTION_IMPORT_VALIDATE_REQUEST_PATH, () =>
  HttpResponse.json(electionImportValidateMockResponse, { status: 200 }),
);

export const ElectionChangeNumberOfVotersHandler = http.put<
  ParamsToString<ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PARAMS>,
  ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY
>(
  "/api/elections/1/voters" satisfies ELECTION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 200 }),
);

export const LoginHandler = http.post<LOGIN_REQUEST_PARAMS, LOGIN_REQUEST_BODY, LoginResponse>(
  "/api/login" satisfies LOGIN_REQUEST_PATH,
  () => HttpResponse.json(loginResponseMockData, { status: 200 }),
);

export const InitialisedHandler = http.get<INITIALISED_REQUEST_PARAMS>(
  "/api/initialised" satisfies INITIALISED_REQUEST_PATH,
  () => new HttpResponse(null, { status: 200 }),
);

export const PollingStationDataEntryGetDifferencesHandler = http.get<
  ParamsToString<POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PARAMS>,
  null,
  DataEntryGetDifferencesResponse
>(
  "/api/polling_stations/3/data_entries/resolve_differences" satisfies POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH,
  () => HttpResponse.json(dataEntryStatusDifferences, { status: 200 }),
);

export const PollingStationDataEntryGetHandler = http.get<
  ParamsToString<POLLING_STATION_DATA_ENTRY_GET_REQUEST_PARAMS>,
  null,
  DataEntryGetResponse
>("/api/polling_stations/5/data_entries/get" satisfies POLLING_STATION_DATA_ENTRY_GET_REQUEST_PATH, () =>
  HttpResponse.json(dataEntryHasErrorsGetMockResponse, { status: 200 }),
);

export const PollingStationDataEntryResolveDifferencesHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  DataEntryStatusResponse
>(
  "/api/polling_stations/3/data_entries/resolve_differences" satisfies POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH,
  () => HttpResponse.json({ status: "first_entry_not_started" }, { status: 200 }),
);

export const PollingStationDataEntryResolveErrorsHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY,
  DataEntryStatusResponse
>(
  "/api/polling_stations/5/data_entries/resolve_errors" satisfies POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH,
  () => HttpResponse.json({ status: "first_entry_not_started" }, { status: 200 }),
);

// get polling stations
export const PollingStationListRequestHandler = http.get<
  ParamsToString<POLLING_STATION_LIST_REQUEST_PARAMS>,
  null,
  PollingStationListResponse
>("/api/elections/1/polling_stations" satisfies POLLING_STATION_LIST_REQUEST_PATH, () => {
  const response: PollingStationListResponse = { polling_stations: pollingStationMockData };
  return HttpResponse.json(response, { status: 200 });
});

// save data entry handler
export const PollingStationDataEntrySaveHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  SaveDataEntryResponse | ErrorResponse
>("/api/polling_stations/1/data_entries/1" satisfies POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH, () =>
  HttpResponse.json(saveDataEntryResponse, { status: 200 }),
);

// get data entry handler
export const PollingStationDataEntryClaimHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PARAMS>,
  null,
  ClaimDataEntryResponse | ErrorResponse
>("/api/polling_stations/1/data_entries/1/claim" satisfies POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH, () =>
  HttpResponse.json(claimDataEntryResponse, { status: 200 }),
);

// delete data entry handler
export const PollingStationDataEntryDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PARAMS>
>(
  "/api/polling_stations/1/data_entries/1" satisfies POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 204 }),
);

// finalise data entry handler
export const PollingStationDataEntryFinaliseHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS>,
  null,
  DataEntryStatusResponse | ErrorResponse
>("/api/polling_stations/1/data_entries/1/finalise" satisfies POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH, () =>
  HttpResponse.json({ status: "second_entry_not_started" }, { status: 200 }),
);

// delete data entries and result handler
export const PollingStationDataEntriesAndResultDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PARAMS>
>(
  "/api/polling_stations/5/data_entries" satisfies POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 204 }),
);

export const PollingStationCreateHandler = http.post<
  ParamsToString<POLLING_STATION_CREATE_REQUEST_PARAMS>,
  POLLING_STATION_CREATE_REQUEST_BODY,
  PollingStation
>("/api/elections/1/polling_stations" satisfies POLLING_STATION_LIST_REQUEST_PATH, () =>
  HttpResponse.json(pollingStationMockData[1], { status: 201 }),
);

export const PollingStationDeleteHandler = http.delete<ParamsToString<POLLING_STATION_DELETE_REQUEST_PARAMS>>(
  "/api/elections/1/polling_stations/1" satisfies POLLING_STATION_DELETE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 200 }),
);

export const PollingStationUpdateHandler = http.put<
  ParamsToString<POLLING_STATION_UPDATE_REQUEST_PARAMS>,
  POLLING_STATION_UPDATE_REQUEST_BODY,
  PollingStation
>("/api/elections/1/polling_stations/1" satisfies POLLING_STATION_UPDATE_REQUEST_PATH, () =>
  HttpResponse.json(pollingStationMockData[1], { status: 200 }),
);

export const PollingStationGetHandler = http.get<
  ParamsToString<POLLING_STATION_GET_REQUEST_PARAMS>,
  null,
  PollingStation
>("/api/elections/1/polling_stations/1" satisfies POLLING_STATION_GET_REQUEST_PATH, () =>
  HttpResponse.json(pollingStationMockData[0], { status: 200 }),
);

export const UserCreateRequestHandler = http.post<USER_CREATE_REQUEST_PARAMS, USER_CREATE_REQUEST_BODY, User>(
  "/api/users" satisfies USER_CREATE_REQUEST_PATH,
  () => HttpResponse.json(userMockData[0], { status: 200 }),
);

export const CreateFirstAdminRequestHandler = http.post<
  ParamsToString<CREATE_FIRST_ADMIN_REQUEST_PARAMS>,
  CREATE_FIRST_ADMIN_REQUEST_BODY,
  User
>("/api/initialise/first-admin" satisfies CREATE_FIRST_ADMIN_REQUEST_PATH, () =>
  HttpResponse.json(userMockData[0], { status: 200 }),
);

export const AdminExistsRequestHandler = http.get<ParamsToString<ADMIN_EXISTS_REQUEST_PARAMS>>(
  "/api/initialise/admin-exists" satisfies ADMIN_EXISTS_REQUEST_PATH,
  () => new HttpResponse(null, { status: 404 }),
);

export const UserGetRequestHandler = http.get<ParamsToString<USER_GET_REQUEST_PARAMS>>(
  "/api/users/1" satisfies USER_GET_REQUEST_PATH,
  () => HttpResponse.json(userMockData[0], { status: 200 }),
);

export const UserListRequestHandler = http.get<USER_LIST_REQUEST_PARAMS, null, UserListResponse>(
  "/api/users" satisfies USER_LIST_REQUEST_PATH,
  () => HttpResponse.json({ users: userMockData }, { status: 200 }),
);

export const UserUpdateRequestHandler = http.put<
  ParamsToString<USER_UPDATE_REQUEST_PARAMS>,
  USER_UPDATE_REQUEST_BODY,
  User
>("/api/users/1" satisfies USER_UPDATE_REQUEST_PATH, () => HttpResponse.json(userMockData[0], { status: 200 }));

export const UserDeleteRequestHandler = http.delete<ParamsToString<USER_DELETE_REQUEST_PARAMS>>(
  "/api/users/1" satisfies USER_DELETE_REQUEST_PATH,
  () => new HttpResponse(null, { status: 200 }),
);

export const handlers: HttpHandler[] = [
  pingHandler,
  AccountRequestHandler,
  AccountUpdateRequestHandler,
  LogRequestHandler,
  LogUsersRequestHandler,
  CommitteeSessionStatusChangeRequestHandler,
  CommitteeSessionUpdateHandler,
  CommitteeSessionCreateHandler,
  CommitteeSessionDeleteHandler,
  InvestigationListRequestHandler,
  PollingStationInvestigationCreateHandler,
  PollingStationInvestigationConcludeHandler,
  PollingStationInvestigationUpdateHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  ElectionImportRequestHandler,
  ElectionImportValidateRequestHandler,
  ElectionChangeNumberOfVotersHandler,
  LoginHandler,
  InitialisedHandler,
  PollingStationDataEntryGetDifferencesHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntryResolveDifferencesHandler,
  PollingStationDataEntryResolveErrorsHandler,
  PollingStationListRequestHandler,
  PollingStationDataEntrySaveHandler,
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationDataEntriesAndResultDeleteHandler,
  PollingStationCreateHandler,
  PollingStationDeleteHandler,
  PollingStationUpdateHandler,
  PollingStationGetHandler,
  UserCreateRequestHandler,
  CreateFirstAdminRequestHandler,
  AdminExistsRequestHandler,
  UserGetRequestHandler,
  UserListRequestHandler,
  UserUpdateRequestHandler,
  UserDeleteRequestHandler,
];
