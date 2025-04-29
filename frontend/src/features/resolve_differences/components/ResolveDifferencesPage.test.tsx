import { useParams } from "react-router";

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryStatusHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
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
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryStatusHandler,
    );
  });

  test("Should render a table", async () => {
    vi.mocked(useParams).mockReturnValue({ pollingStationId: "3" });
    renderPage();

    // Wait for the page to be loaded
    await waitFor(() => {
      expect(screen.queryByRole("table")).toBeInTheDocument();
    });
  });
});
