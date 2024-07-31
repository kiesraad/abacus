import { describe, expect, test } from "vitest";

import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";

import { pollingStationsMockResponse } from "@kiesraad/api-mocks";

import { usePollingStationListRequest } from "./usePollingStationListRequest";

describe("Test usePollingStationListRequest", () => {
  test("doRequest returns expected data", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
    const { result } = renderHook(() => usePollingStationListRequest({ election_id: 1 }), {
      wrapper: Providers,
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(pollingStationsMockResponse);
  });
});
