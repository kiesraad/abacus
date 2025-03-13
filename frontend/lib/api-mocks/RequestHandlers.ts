import { http, type HttpHandler, HttpResponse } from "msw";

import {
  ACCOUNT_UPDATE_REQUEST_BODY,
  ACCOUNT_UPDATE_REQUEST_PARAMS,
  ACCOUNT_UPDATE_REQUEST_PATH,
  ErrorResponse,
  LOGIN_REQUEST_BODY,
  LOGIN_REQUEST_PARAMS,
  LOGIN_REQUEST_PATH,
  LoginResponse,
  POLLING_STATION_CREATE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS,
  POLLING_STATION_DELETE_REQUEST_PARAMS,
  POLLING_STATION_GET_REQUEST_PARAMS,
  POLLING_STATION_LIST_REQUEST_PARAMS,
  POLLING_STATION_UPDATE_REQUEST_PARAMS,
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
} from "@kiesraad/api";

import { electionDetailsMockResponse, electionListMockResponse, electionStatusMockResponse } from "./ElectionMockData";
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

// get election list handler
export const ElectionListRequestHandler = http.get("/api/elections", () =>
  HttpResponse.json(electionListMockResponse, { status: 200 }),
);

// get election details handler
export const ElectionRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/:election_id",
  () => HttpResponse.json(electionDetailsMockResponse, { status: 200 }),
);

// get election status handler
export const ElectionStatusRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/:election_id/status",
  () => HttpResponse.json(electionStatusMockResponse, { status: 200 }),
);

export const LoginHandler = http.post<LOGIN_REQUEST_PARAMS, LOGIN_REQUEST_BODY, LoginResponse, LOGIN_REQUEST_PATH>(
  "/api/user/login",
  () => HttpResponse.json(loginResponseMockData, { status: 200 }),
);

// get polling stations
export const PollingStationListRequestHandler = http.get<ParamsToString<POLLING_STATION_LIST_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations",
  () => {
    const response: PollingStationListResponse = { polling_stations: pollingStationMockData };
    return HttpResponse.json(response, { status: 200 });
  },
);

// save data entry handler
export const PollingStationDataEntrySaveHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  SaveDataEntryResponse | ErrorResponse
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", () => {
  const response: SaveDataEntryResponse = { validation_results: { errors: [], warnings: [] } };
  return HttpResponse.json(response, { status: 200 });
});

// get data entry handler
export const PollingStationDataEntryGetHandler = http.get<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", () =>
  HttpResponse.text(null, { status: 404 }),
);

// delete data entry handler
export const PollingStationDataEntryDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", () =>
  HttpResponse.text(null, { status: 204 }),
);

// finalise data entry handler
export const PollingStationDataEntryFinaliseHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/:election_id/data_entries/:entry_number/finalise", () =>
  HttpResponse.text(null, { status: 200 }),
);

export const PollingStationCreateHandler = http.post<ParamsToString<POLLING_STATION_CREATE_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations",
  () => HttpResponse.json(pollingStationMockData[1]! satisfies PollingStation, { status: 201 }),
);

export const PollingStationDeleteHandler = http.delete<ParamsToString<POLLING_STATION_DELETE_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations/:polling_station_id",
  () => HttpResponse.text("", { status: 200 }),
);

export const PollingStationUpdateHandler = http.put<ParamsToString<POLLING_STATION_UPDATE_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations/:polling_station_id",
  () => HttpResponse.text("", { status: 200 }),
);

export const PollingStationGetHandler = http.get<ParamsToString<POLLING_STATION_GET_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations/:polling_station_id",
  () => HttpResponse.json(pollingStationMockData[0]! satisfies PollingStation, { status: 200 }),
);

export const UserCreateRequestHandler = http.post<
  USER_CREATE_REQUEST_PARAMS,
  USER_CREATE_REQUEST_BODY,
  User,
  USER_CREATE_REQUEST_PATH
>("/api/user", () => HttpResponse.json(userMockData[0], { status: 200 }));

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
  () => HttpResponse.json(loginResponseMockData, { status: 200 }),
);

export const handlers: HttpHandler[] = [
  pingHandler,
  AccountUpdateRequestHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  LoginHandler,
  PollingStationListRequestHandler,
  PollingStationDataEntrySaveHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationCreateHandler,
  PollingStationDeleteHandler,
  PollingStationGetHandler,
  PollingStationUpdateHandler,
  UserCreateRequestHandler,
  UserGetRequestHandler,
  UserListRequestHandler,
  UserUpdateRequestHandler,
  UserDeleteRequestHandler,
  WhoAmIRequestHandler,
];
