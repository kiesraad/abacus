import { http, type HttpHandler, HttpResponse } from "msw";

import {
  DataEntryResponse,
  ErrorResponse,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS,
} from "@kiesraad/api";

import {
  electionListMockResponse,
  electionStatusMockResponse,
  getElectionMockData,
} from "./ElectionMockData";
import { getPollingStationListMockResponse } from "./PollingStationMockData";

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
    try {
      const election = getElectionMockData(Number(params.election_id));
      return HttpResponse.json(election, { status: 200 });
    } catch {
      return HttpResponse.json({}, { status: 404 });
    }
  },
);

export const ElectionStatusRequestHandler = http.get<ParamsToString<{ election_id: number }>>(
  "/api/elections/:election_id/status",
  ({ params }) => {
    try {
      getElectionMockData(Number(params.election_id));
      return HttpResponse.json(electionStatusMockResponse, { status: 200 });
    } catch {
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

    const {
      recounted,
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

      // F.203 A.2 + B.2 + C.2 = D.2
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
          code: "F203",
        });
      }
      // if recounted = false
    } else {
      //SECTION voters_counts
      total_voters_counts = voters_counts.total_admitted_voters_count;

      // F.201 A + B + C = D
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
          code: "F201",
        });
      }
    }

    //SECTION votes_counts
    // F.202 E + F + G = H
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
        code: "F202",
      });
    }

    //SECTION differences_counts
    // F.301 (recounted = false) or F.302 (recounted = true)
    // validate that the difference for more ballots counted is correct
    if (
      total_voters_counts < total_votes_counts &&
      total_votes_counts - total_voters_counts != differences_counts.more_ballots_count
    ) {
      response.validation_results.errors.push({
        fields: ["data.differences_counts.more_ballots_count"],
        code: recounted ? "F302" : "F301",
      });
    }

    // F.303 (recounted = false) or F.304 (recounted = true)
    // validate that the difference for fewer ballots counted is correct
    if (
      total_voters_counts > total_votes_counts &&
      total_voters_counts - total_votes_counts != differences_counts.fewer_ballots_count
    ) {
      response.validation_results.errors.push({
        fields: ["data.differences_counts.fewer_ballots_count"],
        code: recounted ? "F304" : "F303",
      });
    }

    // W.301 validate that only more or fewer ballots counted is filled in when there is a difference in the totals
    if (
      total_voters_counts != total_votes_counts &&
      differences_counts.more_ballots_count != 0 &&
      differences_counts.fewer_ballots_count != 0
    ) {
      response.validation_results.warnings.push({
        fields: [
          "data.differences_counts.more_ballots_count",
          "data.differences_counts.fewer_ballots_count",
        ],
        code: "W301",
      });
    }

    // W.302 if I: M + N + O - K - L = I
    if (
      differences_counts.more_ballots_count !== 0 &&
      differences_counts.too_many_ballots_handed_out_count +
        differences_counts.other_explanation_count +
        differences_counts.no_explanation_count -
        differences_counts.unreturned_ballots_count -
        differences_counts.too_few_ballots_handed_out_count !==
        differences_counts.more_ballots_count
    ) {
      response.validation_results.warnings.push({
        fields: [
          "data.differences_counts.more_ballots_count",
          "data.differences_counts.too_many_ballots_handed_out_count",
          "data.differences_counts.unreturned_ballots_count",
          "data.differences_counts.too_few_ballots_handed_out_count",
          "data.differences_counts.other_explanation_count",
          "data.differences_counts.no_explanation_count",
        ],
        code: "W302",
      });
    }

    // W.303 if J: K + L + N + O - M = J
    if (
      differences_counts.fewer_ballots_count !== 0 &&
      differences_counts.unreturned_ballots_count +
        differences_counts.too_few_ballots_handed_out_count +
        differences_counts.other_explanation_count +
        differences_counts.no_explanation_count -
        differences_counts.too_many_ballots_handed_out_count !==
        differences_counts.fewer_ballots_count
    ) {
      response.validation_results.warnings.push({
        fields: [
          "data.differences_counts.fewer_ballots_count",
          "data.differences_counts.unreturned_ballots_count",
          "data.differences_counts.too_few_ballots_handed_out_count",
          "data.differences_counts.too_many_ballots_handed_out_count",
          "data.differences_counts.other_explanation_count",
          "data.differences_counts.no_explanation_count",
        ],
        code: "W303",
      });
    }

    // W.304 (recounted = false) or W.305 (recounted = true)
    // validate that no difference should be filled in when there is no difference in the totals
    if (
      total_voters_counts == total_votes_counts &&
      (differences_counts.more_ballots_count != 0 || differences_counts.fewer_ballots_count != 0)
    ) {
      if (differences_counts.more_ballots_count != 0) {
        response.validation_results.warnings.push({
          fields: ["data.differences_counts.more_ballots_count"],
          code: recounted ? "W305" : "W304",
        });
      }
      if (differences_counts.fewer_ballots_count != 0) {
        response.validation_results.warnings.push({
          fields: ["data.differences_counts.fewer_ballots_count"],
          code: recounted ? "W305" : "W304",
        });
      }
    }

    // W.306 validate that no difference specifics should be filled in when there is no difference in the totals
    if (
      total_voters_counts == total_votes_counts &&
      (differences_counts.unreturned_ballots_count != 0 ||
        differences_counts.too_few_ballots_handed_out_count != 0 ||
        differences_counts.too_many_ballots_handed_out_count != 0 ||
        differences_counts.other_explanation_count != 0 ||
        differences_counts.no_explanation_count != 0)
    ) {
      response.validation_results.warnings.push({
        fields: [
          "data.differences_counts.unreturned_ballots_count",
          "data.differences_counts.too_few_ballots_handed_out_count",
          "data.differences_counts.too_many_ballots_handed_out_count",
          "data.differences_counts.other_explanation_count",
          "data.differences_counts.no_explanation_count",
        ],
        code: "W306",
      });
    }

    //SECTION political_group_votes
    let candidateVotesSum = 0;
    political_group_votes.forEach((pg) => {
      // F.401
      const sum = pg.candidate_votes.reduce((acc, cv) => acc + cv.votes, 0);
      candidateVotesSum += sum;
      if (sum !== pg.total) {
        response.validation_results.errors.push({
          fields: [`data.political_group_votes[${pg.number - 1}].total`],
          code: "F401",
        });
      }
    });

    // F.204
    if (votes_counts.votes_candidates_counts !== candidateVotesSum) {
      response.validation_results.errors.push({
        fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
        code: "F204",
      });
    }

    //OPTION: threshold checks

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
  ({ params }) => {
    return HttpResponse.json(getPollingStationListMockResponse(Number(params.election_id)), {
      status: 200,
    });
  },
);

// delete data entry handler
export const pollingStationDataEntryDeleteHandler = http.delete<
  ParamsToString<POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS>
>("/api/polling_stations/:polling_station_id/data_entries/:entry_number", () => {
  return HttpResponse.text(null, { status: 204 });
});

export const handlers: HttpHandler[] = [
  pingHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  pollingStationDataEntryHandler,
  PollingStationListRequestHandler,
  pollingStationDataEntryDeleteHandler,
];
