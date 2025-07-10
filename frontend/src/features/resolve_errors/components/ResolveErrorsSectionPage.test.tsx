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

  test("renders read-only section with valid section id", async () => {
    renderSectionPage();

    expect(
      await screen.findByRole("group", { name: "Is het selectievakje op de eerste pagina aangevinkt?" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("radio", { name: "Ja, er was een hertelling" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Nee, er was geen hertelling" })).toBeInTheDocument();
  });
});
