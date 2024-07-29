import { describe, expect, test } from "vitest";

import { overrideOnce, Providers, renderHook, waitFor } from "app/test/unit";

import { usePollingStationDataRequest } from "./usePollingStationDataRequest";

describe("Test usePollingStationDataRequest", () => {
  test("doRequest returns expected data", async () => {
    const polling_station = {
      election_id: 1,
      id: 1,
      number: 33,
      name: 'Stembureau "Op Rolletjes"',
      house_number: "1",
      locality: "Den Haag",
      polling_station_type: "Mobiel",
      postal_code: "1234 YQ",
      street: "Rijksweg A12",
    };
    overrideOnce("get", "/api/polling_stations/1", 200, polling_station);
    const { result } = renderHook(
      () =>
        usePollingStationDataRequest({
          polling_station_id: 1,
        }),
      { wrapper: Providers },
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(polling_station);
  });
});
