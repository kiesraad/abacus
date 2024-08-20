import * as React from "react";

import { describe, expect, test } from "vitest";

import { overrideOnce, renderHook, waitFor } from "app/test/unit";

import {
  ApiProvider,
  PollingStationFormController,
  usePollingStationFormController,
} from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiProvider host="http://testhost">
    <PollingStationFormController election={electionMockData} pollingStationId={1} entryNumber={1}>
      {children}
    </PollingStationFormController>
  </ApiProvider>
);

describe("PollingStationFormController", () => {
  test("PollingStationFormController renderHook", async () => {
    const { result, rerender } = renderHook(() => usePollingStationFormController(), {
      wrapper: Wrapper,
    });

    result.current.registerCurrentForm({
      id: "recounted",
      type: "recounted",
      getValues: () => {
        return {
          recounted: true,
        };
      },
    });

    expect(result.current.values.recounted).toEqual(undefined);

    rerender();

    result.current.submitCurrentForm();

    rerender();
    expect(result.current.values.recounted).toEqual(true);

    await waitFor(() => {
      expect(result.current.formState.current).toBe("voters_votes_counts");
    });

    expect(result.current.targetFormSection).toBe("voters_votes_counts");

    result.current.registerCurrentForm({
      id: "voters_votes_counts",
      type: "voters_and_votes",
      getValues: () => {
        return {
          voters_counts: {
            proxy_certificate_count: 1,
            total_admitted_voters_count: 2,
            voter_card_count: 1,
            poll_card_count: 1,
          },
          votes_counts: {
            blank_votes_count: 0,
            invalid_votes_count: 0,
            total_votes_cast_count: 0,
            votes_candidates_counts: 0,
          },
          voters_recounts: undefined,
        };
      },
    });
    rerender();
    result.current.submitCurrentForm();
    rerender();

    await waitFor(() => {
      expect(result.current.formState.sections.voters_votes_counts.errors.length).toBe(1);
    });

    console.log(result.current.formState.sections.voters_votes_counts);

    expect(result.current.values.voters_counts.proxy_certificate_count).toEqual(1);
  });

  test("It filters out global errors", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
      validation_results: {
        errors: [
          {
            fields: [
              "data.voters_counts.total_admitted_voters_count",
              "data.voters_counts.poll_card_count",
              "data.voters_counts.proxy_certificate_count",
              "data.voters_counts.voter_card_count",
            ],
            code: "F204",
          },
        ],
        warnings: [],
      },
    });

    const { result } = renderHook(() => usePollingStationFormController(), {
      wrapper: Wrapper,
    });

    result.current.registerCurrentForm({
      id: "voters_votes_counts",
      type: "voters_and_votes",
      getValues: () => {
        return {
          voters_counts: {
            proxy_certificate_count: 1,
            voter_card_count: 1,
            poll_card_count: 1,
            total_admitted_voters_count: 3,
          },
          votes_counts: {
            blank_votes_count: 1,
            invalid_votes_count: 1,
            total_votes_cast_count: 1,
            votes_candidates_counts: 3,
          },
          voters_recounts: undefined,
        };
      },
    });

    result.current.submitCurrentForm();

    await waitFor(() => {
      expect(result.current.formState.sections.voters_votes_counts.isSaved).toBe(true);
    });
    expect(result.current.formState.sections.voters_votes_counts.errors.length).toBe(0);
  });
});
