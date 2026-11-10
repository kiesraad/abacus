import { describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { renderHook, screen, waitFor } from "@/testing/test-utils";
import { useElection } from "./useElection";

function renderUseElection(pollingStationId?: number) {
  const { result } = renderHook(() => useElection(pollingStationId), {
    wrapper: ({ children }) => (
      <Providers>
        <ElectionProvider electionId={1}>{children}</ElectionProvider>
      </Providers>
    ),
  });

  return result;
}

describe("useElection", () => {
  test("Throws NotFoundError when given polling station ID is not found", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());
    renderUseElection(1234);

    await waitFor(() => {
      expect(screen.getByText("Error thrown during render: error.not_found")).toBeVisible();
    });
  });

  test("Does not throw NotFoundError when given polling station ID exists", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());
    const result = renderUseElection(1);

    await waitFor(() => {
      expect(screen.queryByText("Error thrown during render: error.not_found")).not.toBeInTheDocument();
      expect(result.current.pollingStation?.id).toEqual(1);
    });
  });

  test("Does not throw NotFoundError when no polling station ID is provided", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());
    const result = renderUseElection();

    await waitFor(() => {
      expect(screen.queryByText("Error thrown during render: error.not_found")).not.toBeInTheDocument();
      expect(result.current.pollingStation).toBeUndefined();
    });
  });
});
