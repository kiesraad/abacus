import { http, type HttpHandler, HttpResponse } from "msw";

import {
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
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PARAMS,
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PARAMS,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY,
  COMMITTEE_SESSION_UPDATE_REQUEST_PARAMS,
  COMMITTEE_SESSION_UPDATE_REQUEST_PATH,
  CommitteeSessionListResponse,
  CREATE_FIRST_ADMIN_REQUEST_BODY,
  CREATE_FIRST_ADMIN_REQUEST_PARAMS,
  CREATE_FIRST_ADMIN_REQUEST_PATH,
  DataEntryGetDifferencesResponse,
  DataEntryGetErrorsResponse,
  DataEntryStatusResponse,
  ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PARAMS,
  ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PATH,
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
  LOGIN_REQUEST_BODY,
  LOGIN_REQUEST_PARAMS,
  LOGIN_REQUEST_PATH,
  LoginResponse,
  POLLING_STATION_CREATE_REQUEST_BODY,
  POLLING_STATION_CREATE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PATH,
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
  POLLING_STATION_LIST_REQUEST_PARAMS,
  POLLING_STATION_LIST_REQUEST_PATH,
  POLLING_STATION_UPDATE_REQUEST_BODY,
  POLLING_STATION_UPDATE_REQUEST_PARAMS,
  POLLING_STATION_UPDATE_REQUEST_PATH,
  PollingStation,
  PollingStationListResponse,
  SaveDataEntryResponse,
  User,
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
  UserListResponse,
  WHOAMI_REQUEST_PARAMS,
  WHOAMI_REQUEST_PATH,
} from "@/types/generated/openapi";

import { committeeSessionListMockResponse } from "./CommitteeSessionMockData";
import {
  claimDataEntryResponse,
  dataEntryGetErrorsMockResponse,
  dataEntryStatusDifferences,
  saveDataEntryResponse,
} from "./DataEntryMockData";
import {
  electionDetailsMockResponse,
  electionImportMockResponse,
  electionImportValidateMockResponse,
  electionListMockResponse,
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

export const AccountUpdateRequestHandler = http.put<
  ACCOUNT_UPDATE_REQUEST_PARAMS,
  ACCOUNT_UPDATE_REQUEST_BODY,
  LoginResponse,
  ACCOUNT_UPDATE_REQUEST_PATH
>("/api/user/account", () => HttpResponse.json(loginResponseMockData, { status: 200 }));

export const LogRequestHandler = http.get<
  ParamsToString<AUDIT_LOG_LIST_REQUEST_PARAMS>,
  null,
  AuditLogListResponse,
  AUDIT_LOG_LIST_REQUEST_PATH
>("/api/log", () => HttpResponse.json(logMockResponse, { status: 200 }));

export const LogUsersRequestHandler = http.get<
  ParamsToString<AUDIT_LOG_LIST_USERS_REQUEST_PARAMS>,
  null,
  User[],
  AUDIT_LOG_LIST_USERS_REQUEST_PATH
>("/api/log-users", () => HttpResponse.json(userMockData, { status: 200 }));

// get election committee session list handler
export const ElectionCommitteeSessionListRequestHandler = http.get<
  ParamsToString<ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PARAMS>,
  null,
  CommitteeSessionListResponse | ErrorResponse,
  ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PATH
>("/api/elections/1/committee_sessions", () => HttpResponse.json(committeeSessionListMockResponse, { status: 200 }));

// committee session status change handler
export const CommitteeSessionStatusChangeRequestHandler = http.put<
  ParamsToString<COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PARAMS>,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  null,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH
>("/api/committee_sessions/1/status", () => HttpResponse.json(null, { status: 200 }));

export const CommitteeSessionChangeNumberOfVotersHandler = http.put<
  ParamsToString<COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PARAMS>,
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_BODY,
  null,
  COMMITTEE_SESSION_NUMBER_OF_VOTERS_CHANGE_REQUEST_PATH
>("/api/committee_sessions/1/voters", () => new HttpResponse(null, { status: 200 }));

export const CommitteeSessionUpdateHandler = http.put<
  ParamsToString<COMMITTEE_SESSION_UPDATE_REQUEST_PARAMS>,
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY,
  null,
  COMMITTEE_SESSION_UPDATE_REQUEST_PATH
>("/api/committee_sessions/1", () => new HttpResponse(null, { status: 200 }));

// get election list handler
export const ElectionListRequestHandler = http.get<
  ParamsToString<ELECTION_LIST_REQUEST_PARAMS>,
  null,
  ElectionListResponse,
  ELECTION_LIST_REQUEST_PATH
>("/api/elections", () => HttpResponse.json(electionListMockResponse, { status: 200 }));

// get election details handler
export const ElectionRequestHandler = http.get<
  ParamsToString<ELECTION_DETAILS_REQUEST_PARAMS>,
  null,
  ElectionDetailsResponse | ErrorResponse,
  ELECTION_DETAILS_REQUEST_PATH
>("/api/elections/1", () => HttpResponse.json(electionDetailsMockResponse, { status: 200 }));

// get election status handler
export const ElectionStatusRequestHandler = http.get<
  ParamsToString<ELECTION_STATUS_REQUEST_PARAMS>,
  null,
  ElectionStatusResponse,
  ELECTION_STATUS_REQUEST_PATH
>("/api/elections/1/status", () => HttpResponse.json(statusResponseMock, { status: 200 }));

export const ElectionImportRequestHandler = http.post<
  ParamsToString<ELECTION_IMPORT_REQUEST_PARAMS>,
  ELECTION_IMPORT_REQUEST_BODY,
  ElectionWithPoliticalGroups,
  ELECTION_IMPORT_REQUEST_PATH
>("/api/elections/import", () => HttpResponse.json(electionImportMockResponse, { status: 201 }));

export const ElectionImportValidateRequestHandler = http.post<
  ParamsToString<ELECTION_IMPORT_VALIDATE_REQUEST_PARAMS>,
  ELECTION_IMPORT_VALIDATE_REQUEST_BODY,
  ElectionDefinitionValidateResponse,
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH
>("/api/elections/import/validate", () => HttpResponse.json(electionImportValidateMockResponse, { status: 200 }));

export const LoginHandler = http.post<LOGIN_REQUEST_PARAMS, LOGIN_REQUEST_BODY, LoginResponse, LOGIN_REQUEST_PATH>(
  "/api/user/login",
  () => HttpResponse.json(loginResponseMockData, { status: 200 }),
);

export const InitialisedHandler = http.get<INITIALISED_REQUEST_PARAMS, null, null, INITIALISED_REQUEST_PATH>(
  "/api/initialised",
  () => new HttpResponse(null, { status: 200 }),
);

export const PollingStationDataEntryGetDifferencesHandler = http.get<
  ParamsToString<POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PARAMS>,
  null,
  DataEntryGetDifferencesResponse,
  POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH
>("/api/polling_stations/3/data_entries/resolve_differences", () =>
  HttpResponse.json(dataEntryStatusDifferences, { status: 200 }),
);

export const PollingStationDataEntryGetErrorsHandler = http.get<
  ParamsToString<POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PARAMS>,
  null,
  DataEntryGetErrorsResponse,
  POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PATH
>("/api/polling_stations/5/data_entries/resolve_errors", () =>
  HttpResponse.json(dataEntryGetErrorsMockResponse, { status: 200 }),
);

export const PollingStationDataEntryResolveDifferencesHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  DataEntryStatusResponse,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH
>("/api/polling_stations/3/data_entries/resolve_differences", () =>
  HttpResponse.json({ status: "first_entry_not_started" }, { status: 200 }),
);

export const PollingStationDataEntryResolveErrorsHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY,
  DataEntryStatusResponse,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH
>("/api/polling_stations/5/data_entries/resolve_errors", () =>
  HttpResponse.json({ status: "first_entry_not_started" }, { status: 200 }),
);

// get polling stations
export const PollingStationListRequestHandler = http.get<
  ParamsToString<POLLING_STATION_LIST_REQUEST_PARAMS>,
  null,
  PollingStationListResponse,
  POLLING_STATION_LIST_REQUEST_PATH
>("/api/elections/1/polling_stations", () => {
  const response: PollingStationListResponse = { polling_stations: pollingStationMockData };
  return HttpResponse.json(response, { status: 200 });
});

// save data entry handler
export const PollingStationDataEntrySaveHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  SaveDataEntryResponse | ErrorResponse,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH
>("/api/polling_stations/1/data_entries/1", () => HttpResponse.json(saveDataEntryResponse, { status: 200 }));

// get data entry handler
export const PollingStationDataEntryClaimHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PARAMS>,
  null,
  ClaimDataEntryResponse | ErrorResponse,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH
>("/api/polling_stations/1/data_entries/1/claim", () => HttpResponse.json(claimDataEntryResponse, { status: 200 }));

// delete data entry handler
export const PollingStationDataEntryDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PARAMS>,
  null,
  null,
  POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH
>("/api/polling_stations/1/data_entries/1", () => new HttpResponse(null, { status: 204 }));

// finalise data entry handler
export const PollingStationDataEntryFinaliseHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PARAMS>,
  null,
  DataEntryStatusResponse | ErrorResponse,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH
>("/api/polling_stations/1/data_entries/1/finalise", () =>
  HttpResponse.json({ status: "second_entry_not_started" }, { status: 200 }),
);

export const PollingStationCreateHandler = http.post<
  ParamsToString<POLLING_STATION_CREATE_REQUEST_PARAMS>,
  POLLING_STATION_CREATE_REQUEST_BODY,
  PollingStation,
  POLLING_STATION_LIST_REQUEST_PATH
>("/api/elections/1/polling_stations", () => HttpResponse.json(pollingStationMockData[1], { status: 201 }));

export const PollingStationDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DELETE_REQUEST_PARAMS>,
  null,
  null,
  POLLING_STATION_DELETE_REQUEST_PATH
>("/api/elections/1/polling_stations/1", () => new HttpResponse(null, { status: 200 }));

export const PollingStationUpdateHandler = http.put<
  ParamsToString<POLLING_STATION_UPDATE_REQUEST_PARAMS>,
  POLLING_STATION_UPDATE_REQUEST_BODY,
  PollingStation,
  POLLING_STATION_UPDATE_REQUEST_PATH
>("/api/elections/1/polling_stations/1", () => HttpResponse.json(pollingStationMockData[1], { status: 200 }));

export const PollingStationGetHandler = http.get<
  ParamsToString<POLLING_STATION_GET_REQUEST_PARAMS>,
  null,
  PollingStation,
  POLLING_STATION_GET_REQUEST_PATH
>("/api/elections/1/polling_stations/1", () => HttpResponse.json(pollingStationMockData[0], { status: 200 }));

export const UserCreateRequestHandler = http.post<
  USER_CREATE_REQUEST_PARAMS,
  USER_CREATE_REQUEST_BODY,
  User,
  USER_CREATE_REQUEST_PATH
>("/api/user", () => HttpResponse.json(userMockData[0], { status: 200 }));

export const CreateFirstAdminRequestHandler = http.post<
  ParamsToString<CREATE_FIRST_ADMIN_REQUEST_PARAMS>,
  CREATE_FIRST_ADMIN_REQUEST_BODY,
  User,
  CREATE_FIRST_ADMIN_REQUEST_PATH
>("/api/initialise/first-admin", () => HttpResponse.json(userMockData[0], { status: 200 }));

export const AdminExistsRequestHandler = http.get<
  ParamsToString<ADMIN_EXISTS_REQUEST_PARAMS>,
  null,
  null,
  ADMIN_EXISTS_REQUEST_PATH
>("/api/initialise/admin-exists", () => new HttpResponse(null, { status: 404 }));

export const UserGetRequestHandler = http.get<
  ParamsToString<USER_GET_REQUEST_PARAMS>,
  null,
  User,
  USER_GET_REQUEST_PATH
>("/api/user/1", () => HttpResponse.json(userMockData[0], { status: 200 }));

export const UserListRequestHandler = http.get<
  USER_LIST_REQUEST_PARAMS,
  null,
  UserListResponse,
  USER_LIST_REQUEST_PATH
>("/api/user", () => HttpResponse.json({ users: userMockData }, { status: 200 }));

export const UserUpdateRequestHandler = http.put<
  ParamsToString<USER_UPDATE_REQUEST_PARAMS>,
  USER_UPDATE_REQUEST_BODY,
  User,
  USER_UPDATE_REQUEST_PATH
>("/api/user/1", () => HttpResponse.json(userMockData[0], { status: 200 }));

export const UserDeleteRequestHandler = http.delete<
  ParamsToString<USER_DELETE_REQUEST_PARAMS>,
  null,
  undefined,
  USER_DELETE_REQUEST_PATH
>("/api/user/1", () => new HttpResponse(null, { status: 200 }));

// get user handler
export const WhoAmIRequestHandler = http.get<WHOAMI_REQUEST_PARAMS, null, LoginResponse, WHOAMI_REQUEST_PATH>(
  "/api/user/whoami",
  () =>
    HttpResponse.json(loginResponseMockData, {
      status: 200,
      headers: { "x-session-expires-at": new Date(Date.now() + 1000 * 60 * 30).toString() },
    }),
);

export const handlers: HttpHandler[] = [
  pingHandler,
  AccountUpdateRequestHandler,
  LogRequestHandler,
  LogUsersRequestHandler,
  ElectionCommitteeSessionListRequestHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  ElectionImportRequestHandler,
  ElectionImportValidateRequestHandler,
  LoginHandler,
  PollingStationDataEntryGetDifferencesHandler,
  PollingStationDataEntryGetErrorsHandler,
  PollingStationDataEntryResolveDifferencesHandler,
  PollingStationDataEntryResolveErrorsHandler,
  PollingStationListRequestHandler,
  PollingStationDataEntrySaveHandler,
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationCreateHandler,
  PollingStationDeleteHandler,
  PollingStationUpdateHandler,
  PollingStationGetHandler,
  UserCreateRequestHandler,
  UserGetRequestHandler,
  UserListRequestHandler,
  UserUpdateRequestHandler,
  UserDeleteRequestHandler,
  WhoAmIRequestHandler,
];
