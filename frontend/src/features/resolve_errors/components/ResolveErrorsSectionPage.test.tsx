import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetErrorsHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { resolveErrorsRoutes } from "../routes";
import { ResolveErrorsSectionPage } from "./ResolveErrorsSectionPage";

vi.mock("react-router", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    useParams: () => ({ electionId: "1", pollingStationId: "5", sectionId: "recounted" }),
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

  test("Error when committee session is not in the correct state", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId/status/:pollingStationId/resolve-errors",
            children: resolveErrorsRoutes,
          },
        ],
      },
    ]);

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await router.navigate("/elections/1/status/1/resolve-errors/voters_votes_counts");

    rtlRender(<Providers router={router} />);

    await expectErrorPage();
  });

  test("renders read-only section with valid section id", async () => {
    renderSectionPage();

    expect(
      await screen.findByRole("group", { name: "Is het selectievakje op de eerste pagina aangevinkt?" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("radio", { name: "Ja, er was een hertelling" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Nee, er was geen hertelling" })).toBeInTheDocument();
  });
});
