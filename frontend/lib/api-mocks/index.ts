import { http, type HttpHandler, HttpResponse } from "msw";

import {
  DataEntryResponse,
  Election,
  ElectionDetailsResponse,
  ElectionListResponse,
  ErrorResponse,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS,
  PollingStation,
  PollingStationListResponse,
  VotersCounts,
  VotesCounts,
} from "@kiesraad/api";

import {
  electionDetailsMockResponse,
  electionListMockResponse,
  electionMockData,
  politicalGroupMockData,
} from "./ElectionMockData";
import { pollingStationListMockResponse, pollingStationMockData } from "./PollingStationMockData";

export const electionMock = electionMockData as Required<Election>;
export const politicalGroupMock = politicalGroupMockData as Required<PoliticalGroup>;
export const pollingStationMock = pollingStationMockData as Required<PollingStation>;
export const pollingStationsMockResponse =
  pollingStationListMockResponse as Required<PollingStationListResponse>;
export const electionMockResponse =
  electionDetailsMockResponse as Required<ElectionDetailsResponse>;
export const electionsMockResponse = electionListMockResponse as Required<ElectionListResponse>;

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
  "/ping",
  async ({ request }) => {
    const data = await request.json();

    const pong = data.ping || "pong";

    return HttpResponse.json({
      pong,
    });
  },
);

export const ElectionListRequestHandler = http.get("/api/elections", () => {
  return HttpResponse.json(electionListMockResponse, { status: 200 });
});

export const ElectionRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/:election_id",
  ({ params }) => {
    const election = electionListMockResponse.elections.find(
      (e: Election) => e.id.toString() === params.election_id,
    );
    if (election) {
      return HttpResponse.json({ election }, { status: 200 });
    } else {
      return HttpResponse.json({}, { status: 404 });
    }
  },
);

export const pollingStationDataEntryHandler = http.post<
  ParamsToString<POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS>,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  DataEntryResponse | ErrorResponse
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", async ({ request }) => {
  let json: POLLING_STATION_DATA_ENTRY_REQUEST_BODY;

  try {
    json = await request.json();
    const response: DataEntryResponse = {
      validation_results: {
        errors: [],
        warnings: [],
      },
    };

    const { voters_counts, votes_counts, political_group_votes } = json.data;

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
            fields: [`data.votes_counts.${field}`],
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
          fields: [`data.voters_counts.${field}`],
        });
      }
    });

    // A + B + C = D
    if (
      voters_counts.poll_card_count +
        voters_counts.proxy_certificate_count +
        voters_counts.voter_card_count !==
      voters_counts.total_admitted_voters_count
    ) {
      response.validation_results.errors.push({
        fields: [
          "data.voters_counts.poll_card_count",
          "data.voters_counts.proxy_certificate_count",
          "data.voters_counts.voter_card_count",
          "data.voters_counts.total_admitted_voters_count",
        ],
        code: "IncorrectTotal",
      });
    }

    // E + F + G = H
    if (
      votes_counts.votes_candidates_counts +
        votes_counts.blank_votes_count +
        votes_counts.invalid_votes_count !==
      votes_counts.total_votes_cast_count
    ) {
      response.validation_results.errors.push({
        fields: [
          "data.votes_counts.total_votes_cast_count",
          "data.votes_counts.votes_candidates_counts",
          "data.votes_counts.blank_votes_count",
          "data.votes_counts.invalid_votes_count",
        ],
        code: "IncorrectTotal",
      });
    }

    //SECTION political_group_votes
    political_group_votes.forEach((pg) => {
      if (valueOutOfRange(pg.total)) {
        response.validation_results.errors.push({
          code: "OutOfRange",
          fields: [`data.political_group_votes[${pg.number - 1}].total`],
        });
      }

      pg.candidate_votes.forEach((cv) => {
        if (valueOutOfRange(cv.votes)) {
          response.validation_results.errors.push({
            code: "OutOfRange",
            fields: [
              `data.political_group_votes[${pg.number - 1}].candidate_votes[${cv.number - 1}].votes`,
            ],
          });
        }
      });

      const sum = pg.candidate_votes.reduce((acc, cv) => acc + cv.votes, 0);
      if (sum !== pg.total) {
        response.validation_results.errors.push({
          code: "IncorrectTotal",
          fields: [`data.political_group_votes[${pg.number - 1}].total`],
        });
      }
    });

    //OPTION:  threshold checks

    return HttpResponse.json(response, { status: 200 });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return HttpResponse.json(
        {
          error: "Invalid JSON",
        },
        { status: 422 },
      );
    } else {
      console.error("Mock request error:", e);
      return HttpResponse.json(
        {
          error: "Internal Server Error",
        },
        { status: 500 },
      );
    }
  }
});

export const PollingStationListRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/:election_id/polling_stations",
  () => {
    return HttpResponse.json(pollingStationListMockResponse, { status: 200 });
  },
);

export const handlers: HttpHandler[] = [
  pingHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  pollingStationDataEntryHandler,
  PollingStationListRequestHandler,
];

function valueOutOfRange(v: number): boolean {
  return v < 0 || v > 999999999;
}
