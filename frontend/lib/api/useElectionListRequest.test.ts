import { describe, expect, test } from "vitest";
import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";
import { useElectionListRequest } from "./useElectionListRequest";

describe("Test useElectionListRequest", () => {
  test("doRequest returns expected data", async () => {
    const elections = {
      elections: [
        {
          id: 1,
          name: "Municipal Election",
          category: "Municipal",
          election_date: "2024-11-30",
          nomination_date: "2024-11-01",
        },
        {
          id: 2,
          name: "Municipal Election",
          category: "Municipal",
          election_date: "2024-01-30",
          nomination_date: "2024-01-01",
        },
      ],
    };
    overrideOnce("get", "/v1/api/elections", 200, elections);
    const { result } = renderHook(() => useElectionListRequest(), { wrapper: Providers });

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(elections);
  });
});
