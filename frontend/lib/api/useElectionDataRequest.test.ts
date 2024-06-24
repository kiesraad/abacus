import { describe, expect, test } from "vitest";
import { renderHook, Providers, waitFor } from "app/test/unit";
import { useElectionDataRequest } from "./useElectionDataRequest";
import { overrideOnce } from "app/test/unit";

describe("Test useElectionDataRequest", () => {
  test("doRequest returns expected data", async () => {
    const election = {
      id: 1,
      name: "Municipal Election",
      category: "Municipal",
      election_date: "2024-11-30",
      nomination_date: "2024-11-01",
      political_groups: [
        {
          number: 1,
          name: "Lijst 1 - Vurige Vleugels Partij",
          candidates: [
            {
              number: 1,
              initials: "A.",
              first_name: "Alice",
              last_name: "Foo",
              locality: "Amsterdam",
              gender: "Female",
            },
            {
              number: 2,
              initials: "C.",
              first_name: "Charlie",
              last_name: "Doe",
              locality: "Rotterdam",
            },
          ],
        },
        {
          number: 2,
          name: "Lijst 2 - Wijzen van Water en Wind",
          candidates: [
            {
              number: 1,
              initials: "A.",
              first_name: "Alice",
              last_name: "Foo",
              locality: "Amsterdam",
              gender: "Female",
            },
            {
              number: 2,
              initials: "C.",
              first_name: "Charlie",
              last_name: "Doe",
              locality: "Rotterdam",
            },
          ],
        },
        {
          number: 3,
          name: "Lijst 3 - Eeuwenoude Aarde Unie",
          candidates: [
            {
              number: 1,
              initials: "A.",
              first_name: "Alice",
              last_name: "Foo",
              locality: "Amsterdam",
              gender: "Female",
            },
            {
              number: 2,
              initials: "C.",
              first_name: "Charlie",
              last_name: "Doe",
              locality: "Rotterdam",
            },
          ],
        },
      ],
    };
    overrideOnce("get", "/v1/api/elections/1", 200, election);
    const { result } = renderHook(
      () =>
        useElectionDataRequest({
          election_id: 1,
        }),
      { wrapper: Providers },
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(election);
  });
});
