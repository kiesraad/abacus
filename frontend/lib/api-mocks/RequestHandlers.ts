import { http, type HttpHandler, HttpResponse } from "msw";

import {
  ErrorResponse,
  POLLING_STATION_CREATE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS,
  POLLING_STATION_GET_REQUEST_PARAMS,
  POLLING_STATION_LIST_REQUEST_PARAMS,
  POLLING_STATION_UPDATE_REQUEST_PARAMS,
  PollingStation,
  PollingStationListResponse,
  SaveDataEntryResponse,
} from "@kiesraad/api";

import { electionDetailsMockResponse, electionListMockResponse, electionStatusMockResponse } from "./ElectionMockData";
import { pollingStationMockData } from "./PollingStationMockData";

type ParamsToString<T> = {
  [P in keyof T]: string;
};

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

export const PollingStationUpdateHandler = http.put<ParamsToString<POLLING_STATION_UPDATE_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations/:polling_station_id",
  () => HttpResponse.text("", { status: 200 }),
);

export const PollingStationGetHandler = http.get<ParamsToString<POLLING_STATION_GET_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations/:polling_station_id",
  () => HttpResponse.json(pollingStationMockData[0]! satisfies PollingStation, { status: 200 }),
);

export const handlers: HttpHandler[] = [
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationListRequestHandler,
  PollingStationDataEntrySaveHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationCreateHandler,
  PollingStationGetHandler,
  PollingStationUpdateHandler,
];
