import { render as rtlRender } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  InvestigationListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { renderReturningRouter, screen } from "@/testing/test-utils";
import type { ElectionDetailsResponse } from "@/types/generated/openapi";

import { ElectionReportPage } from "./ElectionReportPage";

const navigate = vi.fn();

const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  children?: ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
}) => {
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <TestUserProvider userRole="coordinator_gsb">
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <ReactRouter.RouterProvider router={router} />
          </ElectionStatusProvider>
        </ElectionProvider>
      </TestUserProvider>
    </ApiProvider>
  );
};

const renderPage = () => {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <ElectionReportPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
};

describe("GSBElectionReportSection", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
    server.use(InvestigationListRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ committeeSessionId: "1" });
  });

  test("If there is an investigation with corrections, page refers to three documents in the zip", async () => {
    const router = renderPage();
    const electionData = getElectionMockData(
      {},
      { number: 2, status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
    );

    // Set to second session and update investigations
    electionData.current_committee_session.number = 2;
    electionData.investigations.forEach((i) => {
      i.corrected_results = true;
    });

    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await router.navigate("/elections/1/report/committee-session/1/download");

    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tweede zitting gemeentelijk stembureau" }),
    ).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten tweede zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();

    expect(await screen.findByText("In het Zip bestand zitten de volgende documenten:")).toBeInTheDocument();
    expect(
      await screen.findByText("Het proces-verbaal van het gemeentelijk stembureau (P 2a). Dit is een PDF-document."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Het corrigendum van het gemeentelijk stembureau (Na 14-2). Dit is een PDF-document."),
    ).toBeInTheDocument();
    expect(await screen.findByText("EML en CSV bestanden met digitale telresultaten.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten tweede zitting/ })).toBeVisible();
  });

  test("If there is an investigation without corrections, page refers to one document in the zip", async () => {
    const router = renderPage();
    const electionData = getElectionMockData(
      {},
      { number: 2, status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
    );

    // Set to second session and update investigations
    electionData.current_committee_session.number = 2;
    electionData.investigations.forEach((i) => {
      i.corrected_results = false;
    });

    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await router.navigate("/elections/1/report/committee-session/1/download");

    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tweede zitting gemeentelijk stembureau" }),
    ).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Telresultaten tweede zitting gemeentelijk stembureau gemeente Heemdamseburg",
      }),
    ).toBeVisible();

    expect(await screen.findByText("In het Zip bestand zitten de volgende documenten:")).toBeInTheDocument();
    expect(
      await screen.findByText("Het proces-verbaal van het gemeentelijk stembureau (P 2a). Dit is een PDF-document."),
    ).toBeInTheDocument();
    expect(await screen.findByText("EML en CSV bestanden met digitale telresultaten.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Download definitieve documenten tweede zitting/ })).toBeVisible();
  });
});
