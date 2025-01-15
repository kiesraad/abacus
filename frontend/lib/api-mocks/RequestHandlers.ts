import { http, type HttpHandler, HttpResponse } from "msw";

import {
  ElectionDetailsResponse,
  ElectionListResponse,
  ElectionStatusResponse,
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

import { Database } from "./Database";
import { electionListMockResponse, getElectionMockData } from "./ElectionMockData";
import { pollingStationMockData } from "./PollingStationMockData";

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
const pingHandler = http.post<PingParams, PingRequestBody, PingResponseBody>("/ping", async ({ request }) => {
  const data = await request.json();

  const pong = data.ping || "pong";

  return HttpResponse.json({
    pong,
  });
});

// get election list handler
export const ElectionListRequestHandler = http.get("/api/elections", () => {
  const response: ElectionListResponse = {
    elections: Database.elections.map((e) => ({ ...e, political_groups: undefined })),
  };
  return HttpResponse.json(response, { status: 200 });
});

// get election details handler
export const ElectionRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/:election_id",
  ({ params }) => {
    const election = Database.elections.find((e) => e.id === Number(params.election_id));
    if (!election) {
      return HttpResponse.text(null, { status: 404 });
    }
    const pollingStations = Database.pollingStations.filter((ps) => ps.election_id === Number(params.election_id));
    const response: ElectionDetailsResponse = {
      election,
      polling_stations: pollingStations,
    };
    return HttpResponse.json(response, { status: 200 });
  },
);

// get election status handler
export const ElectionStatusRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/*/status",
  ({ params }) => {
    try {
      getElectionMockData();

      const response: ElectionStatusResponse = {
        statuses: [],
      };

      const pollingStationIds = Database.pollingStations
        .filter((ps) => ps.election_id === Number(params.election_id))
        .map((ps) => ps.id);

      for (const polling_station_id of pollingStationIds) {
        if (Database.results.some((r) => r.pollingStationId === polling_station_id)) {
          response.statuses.push({ polling_station_id, status: "definitive" });
        } else if (Database.dataEntries.some((d) => d.pollingStationId === polling_station_id)) {
          const dataEntry = Database.dataEntries.find((d) => d.pollingStationId === polling_station_id);
          response.statuses.push({
            polling_station_id,
            status: "first_entry_in_progress",
            first_data_entry_progress: dataEntry?.progress,
          });
        } else {
          response.statuses.push({ polling_station_id, status: "first_entry_not_started" });
        }
      }

      return HttpResponse.json(response, { status: 200 });
    } catch {
      return HttpResponse.text(null, { status: 404 });
    }
  },
);

// get polling stations
export const PollingStationListRequestHandler = http.get<ParamsToString<POLLING_STATION_LIST_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations",
  ({ params }) => {
    const electionId = Number(params.election_id);
    if (!electionListMockResponse.elections.some((e) => e.id === electionId)) {
      return HttpResponse.json({}, { status: 404 });
    }

    const pollingStations = Database.pollingStations.filter((ps) => ps.election_id === electionId);
    return HttpResponse.json({ polling_stations: pollingStations } satisfies PollingStationListResponse, {
      status: 200,
    });
  },
);

// save data entry handler
export const PollingStationDataEntrySaveHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  SaveDataEntryResponse | ErrorResponse
>("/api/polling_stations/*/data_entries/*", () => {
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
>("/api/polling_stations/*/data_entries/*", () => HttpResponse.text(null, { status: 204 }));

// finalise data entry handler
export const PollingStationDataEntryFinaliseHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/*/data_entries/*/finalise", () => HttpResponse.text(null, { status: 200 }));

export const PollingStationCreateHandler = http.post<ParamsToString<POLLING_STATION_CREATE_REQUEST_PARAMS>>(
  "/api/elections/*/polling_stations",
  () => HttpResponse.json(pollingStationMockData[1]! satisfies PollingStation, { status: 201 }),
);

export const PollingStationUpdateHandler = http.put<ParamsToString<POLLING_STATION_UPDATE_REQUEST_PARAMS>>(
  "/api/elections/*/polling_stations/*",
  () => HttpResponse.text("", { status: 200 }),
);

export const PollingStationGetHandler = http.get<ParamsToString<POLLING_STATION_GET_REQUEST_PARAMS>>(
  "/api/elections/*/polling_stations/*",
  () => HttpResponse.json(pollingStationMockData[0]! satisfies PollingStation, { status: 200 }),
);

export const handlers: HttpHandler[] = [
  pingHandler,
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
