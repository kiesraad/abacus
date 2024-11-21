import { http, type HttpHandler, HttpResponse } from "msw";

import {
  ClientState,
  ElectionDetailsResponse,
  ElectionListResponse,
  ElectionStatusResponse,
  ErrorResponse,
  GetDataEntryResponse,
  POLLING_STATION_CREATE_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS,
  POLLING_STATION_GET_REQUEST_PARAMS,
  POLLING_STATION_LIST_REQUEST_PARAMS,
  POLLING_STATION_UPDATE_REQUEST_PARAMS,
  PollingStation,
  PollingStationListResponse,
  PollingStationRequest,
  SaveDataEntryResponse,
} from "@kiesraad/api";

import { Database, DataEntryRecord, pollingStationID } from "./Database.ts";
import { validate } from "./DataEntry.ts";
import { electionListMockResponse, getElectionMockData } from "./ElectionMockData";

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
  "/api/elections/:election_id/status",
  ({ params }) => {
    try {
      getElectionMockData(Number(params.election_id));

      const response: ElectionStatusResponse = {
        statuses: [],
      };

      const pollingStationIds = Database.pollingStations
        .filter((ps) => ps.election_id === Number(params.election_id))
        .map((ps) => ps.id);
      for (const pollingStationId of pollingStationIds) {
        if (Database.results.some((r) => r.pollingStationId === pollingStationId)) {
          response.statuses.push({ id: pollingStationId, status: "definitive" });
        } else if (Database.dataEntries.some((d) => d.pollingStationId === pollingStationId)) {
          response.statuses.push({ id: pollingStationId, status: "first_entry_in_progress" });
        } else {
          response.statuses.push({ id: pollingStationId, status: "not_started" });
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
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", async ({ request, params }) => {
  let json: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY;

  try {
    json = await request.json();

    if (Database.results.some((r) => r.pollingStationId === Number(params.polling_station_id))) {
      return HttpResponse.json(
        {
          error: "Cannot save data entry for a polling station that has already been finalised",
          reference: "PollingStationAlreadyFinalized",
          fatal: false,
        } satisfies ErrorResponse,
        { status: 409 },
      );
    }

    const dataEntry: DataEntryRecord = {
      pollingStationId: Number(params.polling_station_id),
      entryNumber: Number(params.entry_number),
      data: json.data,
      clientState: json.client_state as ClientState,
      updated_at: Number(Date.now() / 1000),
    };

    Database.dataEntries = Database.dataEntries.filter(
      (d) => d.pollingStationId !== dataEntry.pollingStationId || d.entryNumber !== dataEntry.entryNumber,
    );
    Database.dataEntries.push(dataEntry);

    const response: SaveDataEntryResponse = {
      validation_results: validate(json.data),
    };
    return HttpResponse.json(response, { status: 200 });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return HttpResponse.json(
        { error: "Invalid JSON", reference: "InvalidData", fatal: true } satisfies ErrorResponse,
        { status: 422 },
      );
    } else {
      console.error("Mock request error:", e);
      return HttpResponse.json(
        { error: "Internal Server Error", reference: "InternalServerError", fatal: true } satisfies ErrorResponse,
        { status: 500 },
      );
    }
  }
});

// get data entry handler
export const PollingStationDataEntryGetHandler = http.get<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", ({ params }) => {
  const pollingStationId = Number(params.polling_station_id);
  const entryNumber = Number(params.entry_number);
  const dataEntryRecord = Database.dataEntries.find(
    (d) => d.pollingStationId === pollingStationId && d.entryNumber === entryNumber,
  );
  if (!dataEntryRecord) return HttpResponse.text(null, { status: 404 });

  const response: GetDataEntryResponse = {
    data: dataEntryRecord.data,
    client_state: dataEntryRecord.clientState,
    validation_results: validate(dataEntryRecord.data),
    updated_at: Number(Date.now() / 1000),
  };
  return HttpResponse.json(response, { status: 200 });
});

// delete data entry handler
export const PollingStationDataEntryDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", ({ params }) => {
  Database.dataEntries = Database.dataEntries.filter(
    (d) => d.pollingStationId !== Number(params.polling_station_id) || d.entryNumber !== Number(params.entry_number),
  );
  return HttpResponse.text(null, { status: 204 });
});

// finalise data entry handler
export const PollingStationDataEntryFinaliseHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PARAMS>
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number/finalise", ({ params }) => {
  const idx = Database.dataEntries.findIndex(
    (d) => d.pollingStationId === Number(params.polling_station_id) && d.entryNumber === Number(params.entry_number),
  );
  if (idx === -1) return HttpResponse.text(null, { status: 404 });

  const dataEntry = Database.dataEntries.splice(idx, 1)[0];
  if (!dataEntry) return HttpResponse.text(null, { status: 404 });

  Database.results.push({
    pollingStationId: dataEntry.pollingStationId,
    entryNumber: dataEntry.entryNumber,
    data: dataEntry.data,
    created_at: dataEntry.updated_at,
  });

  return HttpResponse.text(null, { status: 200 });
});

export const PollingStationCreateHandler = http.post<ParamsToString<POLLING_STATION_CREATE_REQUEST_PARAMS>>(
  "/api/elections/:election_id/polling_stations",
  async ({ request, params }) => {
    const electionID = parseInt(params.election_id, 10);

    const json = (await request.json()) as PollingStationRequest;

    //check if exists
    const ps = Database.pollingStations.find((ps) => ps.election_id === electionID && ps.number === json.number);
    if (ps) {
      const errorResponse: ErrorResponse = {
        error: "Polling station already exists",
        fatal: false,
        reference: "EntryNotUnique",
      };
      return HttpResponse.json(errorResponse, { status: 409 });
    }

    const newPollingStation: PollingStation = {
      id: pollingStationID(),
      election_id: electionID,
      ...json,
    };

    Database.pollingStations.push(newPollingStation);

    return HttpResponse.json(newPollingStation, { status: 201 });
  },
);

export const PollingStationUpdateHandler = http.put<ParamsToString<POLLING_STATION_UPDATE_REQUEST_PARAMS>>(
  "/api/polling_stations/:polling_station_id",
  async ({ request, params }) => {
    const pollingStationId = parseInt(params.polling_station_id, 10);

    const json = (await request.json()) as PollingStationRequest;

    //check if exists
    const ps = Database.pollingStations.find((ps) => ps.id === pollingStationId);
    if (ps) {
      const updatedPollingStation: PollingStation = {
        ...ps,
        ...json,
      };

      Database.pollingStations = Database.pollingStations.map((ps) =>
        ps.id === pollingStationId ? updatedPollingStation : ps,
      );

      return HttpResponse.json(updatedPollingStation, { status: 200 });
    }

    return HttpResponse.json(
      {
        error: "Not Found",
        fatal: false,
        reference: "EntryNotFound",
      } satisfies ErrorResponse,
      { status: 404 },
    );
  },
);

export const PollingStationGetHandler = http.get<ParamsToString<POLLING_STATION_GET_REQUEST_PARAMS>>(
  "/api/polling_stations/:polling_station_id",
  ({ params }) => {
    const pollingStationId = parseInt(params.polling_station_id, 10);

    //check if exists
    const ps = Database.pollingStations.find((ps) => ps.id === pollingStationId);
    if (ps) {
      return HttpResponse.json(ps, { status: 200 });
    }
    return HttpResponse.text("Not Found", { status: 404 });
  },
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
