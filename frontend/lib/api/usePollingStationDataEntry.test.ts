import { describe, expect, test, assert } from "vitest";
import { renderHook, waitFor, Providers } from "app/test/unit";
import { usePollingStationDataEntry } from "./usePollingStationDataEntry";
import { overrideOnce } from "app/test/unit";

describe("useApiRequest", () => {
  test("it renders", async () => {
    overrideOnce("post", "/v1/api/polling_stations/:id/data_entries/:entry_number", 200, {
      ok: true,
    });

    const { result } = renderHook(
      () =>
        usePollingStationDataEntry({
          id: 1,
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
      },
    });

    await waitFor(() => {
      const [, { data }] = result.current;
      expect(data).not.toBe(null);
    });

    const [, { data }] = result.current;
    assert(data !== null, "data is not null");
    expect(data.ok).toBe(true);
  });
});
