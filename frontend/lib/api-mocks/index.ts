import { http, type HttpHandler, HttpResponse } from "msw";
import {
  DataEntryResponse,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS,
  ErrorResponse,
  VotesCounts,
  VotersCounts,
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
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  DataEntryResponse | ErrorResponse
>("/v1/api/polling_stations/:id/data_entries/:entry_number", async ({ request }) => {
  let json: POLLING_STATION_DATA_ENTRY_REQUEST_BODY;

  try {
    json = await request.json();
    const response: DataEntryResponse = {
      message: "Data saved",
      saved: true,
      validation_results: {
        errors: [],
        warnings: [],
      },
    };

    const { voters_counts, votes_counts } = json.data;

    const votesFields: (keyof VotesCounts)[] = [
      "blank_votes_count",
      "invalid_votes_count",
      "total_votes_cast_count",
      "votes_candidates_counts",
    ];

    votesFields.forEach((field) => {
      if (field in votes_counts) {
        if (valueOutOfRange(votes_counts[field])) {
          response.validation_results.errors.push({
            code: "OutOfRange",
            fields: [field],
          });
        }
      }
    });

    const votersFields: (keyof VotersCounts)[] = [
      "poll_card_count",
      "proxy_certificate_count",
      "total_admitted_voters_count",
      "voter_card_count",
    ];

    votersFields.forEach((field) => {
      if (valueOutOfRange(voters_counts[field])) {
        response.validation_results.errors.push({
          code: "OutOfRange",
          fields: [field],
        });
      }
    });

    if (
      votes_counts.votes_candidates_counts +
        votes_counts.blank_votes_count +
        votes_counts.invalid_votes_count !==
      votes_counts.total_votes_cast_count
    ) {
      response.validation_results.errors.push({
        fields: [
          "votes_counts.total_votes_cast_count",
          "votes_counts.votes_candidates_counts",
          "votes_counts.blank_votes_count",
          "votes_counts.invalid_votes_count",
        ],
        code: "IncorrectTotal",
      });
    }

    //OPTION:  threshold checks

    return HttpResponse.json(response, { status: 200 });
  } catch (e) {
    return HttpResponse.json(
      {
        error: "invalid json",
      },
      { status: 422 },
    );
  }
});

export const handlers: HttpHandler[] = [pingHandler, pollingStationDataEntryHandler];

function valueOutOfRange(v: number): boolean {
  return v < 0 || v > 999999999;
}
