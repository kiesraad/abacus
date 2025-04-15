import { render } from "@testing-library/react";
import { beforeEach, describe, test } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionStatusProvider } from "@/api/election/ElectionStatusProvider";
import { TestUserProvider } from "@/api/TestUserProvider";
import { dataEntryStatusDifferences } from "@/testing/api-mocks/DataEntryMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  WhoAmIRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { waitFor } from "@/testing/test-utils";

import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

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
    overrideOnce("get", "/api/polling_stations/4/data_entries", 200, dataEntryStatusDifferences);
    renderPage();

    // Wait for the page to be loaded
    await waitFor(() => {
      // expect(screen.queryByRole("table")).toBeInTheDocument();
    });
  });
});
