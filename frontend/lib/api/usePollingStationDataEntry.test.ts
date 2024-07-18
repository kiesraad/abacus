import { assert, describe, expect, test } from "vitest";

import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";

import { usePollingStationDataEntry } from "./usePollingStationDataEntry";

describe("usePollingStationDataEntry", () => {
  test("doSubmit parses ok response", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
      message: "should work",
    });

    const { result } = renderHook(
      () =>
        usePollingStationDataEntry({
          polling_station_id: 1,
          entry_number: 1,
        }),
      { wrapper: Providers },
    );

    const [doSubmit] = result.current;
    doSubmit({
      data: {
        voters_counts: {
          poll_card_count: 1,
          proxy_certificate_count: 2,
          voter_card_count: 3,
          total_admitted_voters_count: 4,
        },
        votes_counts: {
          votes_candidates_counts: 5,
          blank_votes_count: 6,
          invalid_votes_count: 7,
          total_votes_cast_count: 8,
        },
        differences_counts: {
          more_ballots_count: 2,
          fewer_ballots_count: 0,
          unreturned_ballots_count: 0,
          too_few_ballots_handed_out_count: 0,
          too_many_ballots_handed_out_count: 1,
          other_explanation_count: 0,
          no_explanation_count: 1,
        },
        political_group_votes: [
          {
            candidate_votes: [{ number: 1, votes: 0 }],
            number: 1,
            total: 0,
          },
        ],
      },
    });

    await waitFor(() => {
      const [, { data }] = result.current;
      expect(data).not.toBe(null);
    });

    const [, { data }] = result.current;
    assert(data !== null, "data is not null");
    expect(data.message).toBe("should work");
  });
});
