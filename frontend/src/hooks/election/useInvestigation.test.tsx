import { describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData, mockInvestigations } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { renderHook, waitFor } from "@/testing/test-utils";
import { DataEntryStatusName, PollingStationInvestigation } from "@/types/generated/openapi";

import useInvestigations from "./useInvestigations";

function renderUseInvestigations() {
  const { result } = renderHook(() => useInvestigations(), {
    wrapper: ({ children }) => (
      <Providers>
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>{children}</ElectionStatusProvider>
        </ElectionProvider>
      </Providers>
    ),
  });

  return result;
}

describe("useInvestigations", () => {
  test("returns empty arrays for first committee session", async () => {
    const firstSessionMockResponse = getElectionMockData({}, { number: 1 }, mockInvestigations);

    overrideOnce("get", "/api/elections/1", 200, firstSessionMockResponse);
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    const result = renderUseInvestigations();

    await waitFor(() => {
      expect(result.current.investigations).toEqual([]);
      expect(result.current.currentInvestigations).toEqual([]);
      expect(result.current.handledInvestigations).toEqual([]);
      expect(result.current.missingInvestigations).toEqual([]);
    });
  });

  test("categorizes investigations in current/handled", async () => {
    const investigations: PollingStationInvestigation[] = [
      {
        // Should be current
        polling_station_id: 1,
        reason: "Reason 1",
        findings: "Findings 1",
        corrected_results: true,
      },
      {
        // Should be handled
        polling_station_id: 2,
        reason: "Reason 2",
        findings: "Findings 2",
        corrected_results: false,
      },
      {
        // Should be current
        polling_station_id: 3,
        reason: "Reason 3",
      },
    ];

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2 }, investigations));
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "first_entry_in_progress" as DataEntryStatusName },
        { polling_station_id: 2, status: "definitive" as DataEntryStatusName },
        { polling_station_id: 3, status: "first_entry_not_started" as DataEntryStatusName },
      ],
    });

    const result = renderUseInvestigations();
    await waitFor(() => {
      expect(result.current.investigations).toHaveLength(3);

      expect(result.current.currentInvestigations).toHaveLength(2);
      expect(result.current.currentInvestigations.map((i) => i.polling_station_id)).toEqual([1, 3]);

      expect(result.current.handledInvestigations).toHaveLength(1);
      expect(result.current.handledInvestigations[0]?.polling_station_id).toBe(2);
    });
  });

  test("categorizes missing investigations", async () => {
    // Initialize with new polling station without id_prev_session and no investigation
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData({}, { number: 2 }),
      polling_stations: [
        ...pollingStationMockData.slice(0, 3),
        {
          id: 123,
          number: 123,
          name: "New polling station",
          id_prev_session: undefined,
        },
      ],
    });
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    const result = renderUseInvestigations();

    await waitFor(() => {
      expect(result.current.missingInvestigations).toHaveLength(1);
      expect(result.current.missingInvestigations[0]?.id).toBe(123);
    });
  });

  test("includes correct polling station and status data", async () => {
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData({}, { number: 2 }, [
        {
          polling_station_id: 1,
          reason: "Test investigation",
        },
      ]),
    );
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [{ polling_station_id: 1, status: "second_entry_in_progress" as DataEntryStatusName }],
    });

    const result = renderUseInvestigations();

    await waitFor(() => {
      expect(result.current.investigations).toHaveLength(1);

      const investigation = result.current.investigations[0];
      expect(investigation?.polling_station_id).toBe(1);
      expect(investigation?.reason).toBe("Test investigation");
      expect(investigation?.pollingStation).toBeDefined();
      expect(investigation?.pollingStation.name).toBe("Op Rolletjes");
      expect(investigation?.status).toBe("second_entry_in_progress");
    });
  });
});
