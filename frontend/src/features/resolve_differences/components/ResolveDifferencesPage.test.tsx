import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryStatusHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { screen } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ pollingStationId: "3" }),
}));

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
    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
