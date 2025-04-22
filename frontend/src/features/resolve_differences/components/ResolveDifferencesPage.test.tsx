import { useParams } from "react-router";

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { dataEntryStatusDifferences } from "@/testing/api-mocks/DataEntryMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  WhoAmIRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { screen, waitFor } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

vi.mock("react-router");

const renderPage = () => {
  render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ResolveDifferencesPage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
};

describe("ResolveDifferencesPage", () => {
  beforeEach(() => {
    server.use(WhoAmIRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler, ElectionListRequestHandler);
  });

  test("Should render a table", async () => {
    vi.mocked(useParams).mockReturnValue({ pollingStationId: "3" });
    overrideOnce("get", "/api/polling_stations/3/data_entries", 200, dataEntryStatusDifferences);
    renderPage();

    // Wait for the page to be loaded
    await waitFor(() => {
      expect(screen.queryByRole("table")).toBeInTheDocument();
    });
  });
});
