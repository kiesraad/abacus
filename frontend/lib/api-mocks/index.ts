import { http, type HttpHandler, HttpResponse } from "msw";

import {
  DataEntryResponse,
  DifferencesCounts,
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
  VotersRecounts,
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
  () => {
    return HttpResponse.json(electionDetailsMockResponse, { status: 200 });
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

    const {
      // recounted,
      voters_counts,
      votes_counts,
      voters_recounts,
      differences_counts,
      political_group_votes,
    } = json.data;

    const total_votes_counts = votes_counts.total_votes_cast_count;
    let total_voters_counts;

    // if recounted = true
    if (voters_recounts) {
      //SECTION voters_recounts
      total_voters_counts = voters_recounts.total_admitted_voters_recount;
      const votersRecountsFields: (keyof VotersRecounts)[] = [
        "poll_card_recount",
        "proxy_certificate_recount",
        "total_admitted_voters_recount",
        "voter_card_recount",
      ];
      votersRecountsFields.forEach((field) => {
        if (valueOutOfRange(voters_recounts[field])) {
          response.validation_results.errors.push({
            fields: [`data.voters_recounts.${field}`],
            code: "OutOfRange",
          });
        }
      });

      // F.13 A.2 + B.2 + C.2 = D.2
      if (
        voters_recounts.poll_card_recount +
          voters_recounts.proxy_certificate_recount +
          voters_recounts.voter_card_recount !==
        voters_recounts.total_admitted_voters_recount
      ) {
        response.validation_results.errors.push({
          fields: [
            "data.voters_recounts.poll_card_recount",
            "data.voters_recounts.proxy_certificate_recount",
            "data.voters_recounts.voter_card_recount",
            "data.voters_recounts.total_admitted_voters_recount",
          ],
          code: "IncorrectTotal",
        });
      }
      // if recounted = false
    } else {
      //SECTION voters_counts
      total_voters_counts = voters_counts.total_admitted_voters_count;
      const votersCountsFields: (keyof VotersCounts)[] = [
        "poll_card_count",
        "proxy_certificate_count",
        "total_admitted_voters_count",
        "voter_card_count",
      ];

      votersCountsFields.forEach((field) => {
        if (valueOutOfRange(voters_counts[field])) {
          response.validation_results.errors.push({
            fields: [`data.voters_counts.${field}`],
            code: "OutOfRange",
          });
        }
      });

      // F.11 A + B + C = D
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
    }

    //SECTION votes_counts
    const votesCountsFields: (keyof VotesCounts)[] = [
      "blank_votes_count",
      "invalid_votes_count",
      "total_votes_cast_count",
      "votes_candidates_counts",
    ];

    votesCountsFields.forEach((field) => {
      if (field in votes_counts) {
        if (valueOutOfRange(votes_counts[field])) {
          response.validation_results.errors.push({
            fields: [`data.votes_counts.${field}`],
            code: "OutOfRange",
          });
        }
      }
    });

    // F.12 E + F + G = H
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

    // F.21 (recounted = false) or F.22 (recounted = true)
    // validate that the difference for more ballots counted is correct
    if (
      total_voters_counts < total_votes_counts &&
      total_votes_counts - total_voters_counts != differences_counts.more_ballots_count
    ) {
      response.validation_results.errors.push({
        fields: ["data.differences_counts.more_ballots_count"],
        code: "IncorrectDifference",
      });
    }

    // F.23 (recounted = false) or F.24 (recounted = true)
    // validate that the difference for fewer ballots counted is correct
    if (
      total_voters_counts > total_votes_counts &&
      total_voters_counts - total_votes_counts != differences_counts.fewer_ballots_count
    ) {
      response.validation_results.errors.push({
        fields: ["data.differences_counts.fewer_ballots_count"],
        code: "IncorrectDifference",
      });
    }

    // F.25 validate that only more or fewer ballots counted is filled in when there is a difference in the totals
    if (
      total_voters_counts != total_votes_counts &&
      differences_counts.more_ballots_count != 0 &&
      differences_counts.fewer_ballots_count != 0
    ) {
      response.validation_results.errors.push({
        fields: [
          "data.differences_counts.more_ballots_count",
          "data.differences_counts.fewer_ballots_count",
        ],
        code: "ConflictingDifferences",
      });
    }

    //SECTION differences_counts
    const differencesCountsFields: (keyof DifferencesCounts)[] = [
      "more_ballots_count",
      "fewer_ballots_count",
      "unreturned_ballots_count",
      "too_few_ballots_handed_out_count",
      "too_many_ballots_handed_out_count",
      "other_explanation_count",
      "no_explanation_count",
    ];

    differencesCountsFields.forEach((field) => {
      if (valueOutOfRange(differences_counts[field])) {
        response.validation_results.errors.push({
          fields: [`data.differences_counts.${field}`],
          code: "OutOfRange",
        });
      }
    });

    // F.26 if I: M + N + O = I
    if (
      differences_counts.more_ballots_count !== 0 &&
      differences_counts.too_many_ballots_handed_out_count +
        differences_counts.other_explanation_count +
        differences_counts.no_explanation_count !==
        differences_counts.more_ballots_count
    ) {
      response.validation_results.errors.push({
        fields: [
          "data.differences_counts.more_ballots_count",
          "data.differences_counts.too_many_ballots_handed_out_count",
          "data.differences_counts.other_explanation_count",
          "data.differences_counts.no_explanation_count",
        ],
        code: "IncorrectTotal",
      });
    }

    // F.27 if J: K + L + N + O = J
    if (
      differences_counts.fewer_ballots_count !== 0 &&
      differences_counts.unreturned_ballots_count +
        differences_counts.too_few_ballots_handed_out_count +
        differences_counts.other_explanation_count +
        differences_counts.no_explanation_count !==
        differences_counts.fewer_ballots_count
    ) {
      response.validation_results.errors.push({
        fields: [
          "data.differences_counts.fewer_ballots_count",
          "data.differences_counts.unreturned_ballots_count",
          "data.differences_counts.too_few_ballots_handed_out_count",
          "data.differences_counts.other_explanation_count",
          "data.differences_counts.no_explanation_count",
        ],
        code: "IncorrectTotal",
      });
    }

    //SECTION political_group_votes
    let candidateVotesSum = 0;
    political_group_votes.forEach((pg) => {
      if (valueOutOfRange(pg.total)) {
        response.validation_results.errors.push({
          fields: [`data.political_group_votes[${pg.number - 1}].total`],
          code: "OutOfRange",
        });
      }

      pg.candidate_votes.forEach((cv) => {
        if (valueOutOfRange(cv.votes)) {
          response.validation_results.errors.push({
            fields: [
              `data.political_group_votes[${pg.number - 1}].candidate_votes[${cv.number - 1}].votes`,
            ],
            code: "OutOfRange",
          });
        }
      });

      // F.31
      const sum = pg.candidate_votes.reduce((acc, cv) => acc + cv.votes, 0);
      candidateVotesSum += sum;
      if (sum !== pg.total) {
        response.validation_results.errors.push({
          fields: [`data.political_group_votes[${pg.number - 1}].total`],
          code: "IncorrectTotal",
        });
      }
    });

    // F.14
    if (votes_counts.votes_candidates_counts !== candidateVotesSum) {
      response.validation_results.errors.push({
        fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
        code: "IncorrectTotal",
      });
    }

    //OPTION: threshold checks

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
