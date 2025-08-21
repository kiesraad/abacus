import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetErrorsHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveErrorsSectionPage } from "./ResolveErrorsSectionPage";

vi.mock("react-router", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    useParams: () => ({ electionId: "1", pollingStationId: "5", sectionId: "voters_votes_counts" }),
  };
});

const renderSectionPage = () => {
  return render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ResolveErrorsSectionPage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
};

describe("ResolveErrorsSectionPage", () => {
  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetErrorsHandler,
    );
  });

  test("renders read-only section with valid section id", async () => {
    renderSectionPage();

    // Verify the section renders with the correct title
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Toegelaten kiezers en uitgebrachte stemmen B1-3.1 en 3.2",
      }),
    ).toBeVisible();

    // Verify some expected content is present
    expect(screen.getByText("A en B tellen niet op tot D")).toBeInTheDocument();
  });
});
