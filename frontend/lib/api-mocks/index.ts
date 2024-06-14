import { http, type HttpHandler, HttpResponse } from "msw";
import {
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS,
} from "@kiesraad/api";

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

const pingHandler = http.post<PingParams, PingRequestBody, PingResponseBody>(
  "/v1/ping",
  async ({ request }) => {
    const data = await request.json();

    const pong = data.ping || "pong";

    return HttpResponse.json({
      pong,
    });
  },
);

export const pollingStationDataEntryHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY
>("/v1/api/polling_stations/:id/data_entries/:entry_number", async ({ request }) => {
  let json;
  try {
    json = await request.json();
  } catch (e) {
    //eslint-disable-next-line
    return HttpResponse.text(`${e}`, { status: 422 });
  }
  if ("voters_counts" in json.data) {
    return HttpResponse.text("", { status: 200 });
  }
  return HttpResponse.json({ message: "missing fields", errorCode: "TBD" }, { status: 500 });
});

const returnData = `{"election":{"id":1,"name":"Municipal Election","category":"Municipal","election_date":"2024-11-30","nomination_date":"2024-11-01","political_groups":[{"number":1,"name":"Political Group A","candidates":[{"number":1,"initials":"A.","first_name":"Alice","last_name":"Foo","locality":"Amsterdam","gender":"Female"},{"number":2,"initials":"C.","first_name":"Charlie","last_name":"Doe","locality":"Rotterdam"}]}]}}`;

export const politicalPartiesRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/v1/api/elections/:id",
  async ({ request }) => {
    try {
      await request.json();
    } catch (e) {
      //eslint-disable-next-line
      return HttpResponse.text(`${e}`, { status: 422 });
    }
    return HttpResponse.text(returnData, { status: 200 });
  },
);

export const handlers: HttpHandler[] = [
  pingHandler,
  pollingStationDataEntryHandler,
  politicalPartiesRequestHandler,
];
