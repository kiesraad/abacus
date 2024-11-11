import * as React from "react";

import { describe, expect, test } from "vitest";

import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";

import { PollingStationFormController, usePollingStationFormController } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <Providers>
    <PollingStationFormController election={electionMockData} pollingStationId={1} entryNumber={1}>
      {children}
    </PollingStationFormController>
  </Providers>
);

describe("PollingStationFormController", () => {
  test("PollingStationFormController renderHook", async () => {
    const { result } = renderHook(() => usePollingStationFormController(), {
      wrapper: Wrapper,
    });

    // wait for the controller to be initialised
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    result.current.registerCurrentForm({
      id: "recounted",
      type: "recounted",
      getValues: () => {
        return {
          recounted: false,
        };
      },
    });
    expect(result.current.values.recounted).toEqual(undefined);

    await result.current.submitCurrentForm();

    await waitFor(() => {
      expect(result.current.values.recounted).toEqual(false);
      expect(result.current.formState.furthest).toBe("voters_votes_counts");
    });

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
            votes_candidates_count: 0,
          },
          voters_recounts: undefined,
        };
      },
    });
    await waitFor(() => {
      // wait for the form state to be updated after registering the form
      expect(result.current.formState.current).toBe("voters_votes_counts");
    });

    await result.current.submitCurrentForm();

    await waitFor(() => {
      // expect error F.201
      expect(result.current.formState.sections.voters_votes_counts.errors.length).toBe(1);
    });

    expect(result.current.values.voters_counts.proxy_certificate_count).toEqual(1);
  });

  test("It filters out global errors", async () => {
    const { result } = renderHook(() => usePollingStationFormController(), {
      wrapper: Wrapper,
    });

    // wait for the controller to be initialised
    await waitFor(() => {
      expect(result.current).not.toBeNull();
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
            votes_candidates_count: 3,
          },
          voters_recounts: undefined,
        };
      },
    });
    await waitFor(() => {
      // wait for the form state to be updated after registering the form
      expect(result.current.formState.current).toBe("voters_votes_counts");
    });

    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
      validation_results: {
        errors: [
          {
            fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
            code: "F204",
          },
        ],
        warnings: [],
      },
    });

    await result.current.submitCurrentForm();

    await waitFor(() => {
      expect(result.current.formState.sections.voters_votes_counts.isSaved).toBe(true);
    });
    expect(result.current.formState.sections.voters_votes_counts.errors.length).toBe(0);
  });
});
