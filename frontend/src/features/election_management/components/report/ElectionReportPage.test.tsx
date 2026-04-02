import { render as rtlRender, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  getCommitteeSessionMockData,
  getCSBCommitteeSessionMockData,
} from "@/testing/api-mocks/CommitteeSessionMockData";
import { getCSBElectionMockData, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  CSBCommitteeSessionStatusChangeRequestHandler,
  CSBElectionRequestHandler,
  CSBElectionStatusRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  InvestigationListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import {
  expectConflictErrorPage,
  renderReturningRouter,
  screen,
  setupTestRouter,
  spyOnHandler,
  waitFor,
} from "@/testing/test-utils";
import type {
  CommitteeCategory,
  CommitteeSession,
  ElectionDetailsResponse,
  ErrorResponse,
} from "@/types/generated/openapi";

import { ElectionReportPage } from "./ElectionReportPage";

const navigate = vi.fn();

const Providers = ({
  committeeCategory = "GSB",
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  committeeCategory?: CommitteeCategory;
  children?: ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
}) => {
  const electionId = committeeCategory === "CSB" ? 2 : 1;
  const coordinatorRole = committeeCategory === "CSB" ? "coordinator_csb" : "coordinator_gsb";
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <TestUserProvider userRole={coordinatorRole}>
        <ElectionProvider electionId={electionId}>
          <ElectionStatusProvider electionId={electionId}>
            <ReactRouter.RouterProvider router={router} />
          </ElectionStatusProvider>
        </ElectionProvider>
      </TestUserProvider>
    </ApiProvider>
  );
};

const renderPage = (committeeCategory: CommitteeCategory = "GSB") => {
  const electionId = committeeCategory === "CSB" ? 2 : 1;
  return renderReturningRouter(
    <ElectionProvider electionId={electionId}>
      <ElectionStatusProvider electionId={electionId}>
        <ElectionReportPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
};

describe("ElectionReportPage", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
  });

  describe("GSB", () => {
    beforeEach(() => {
      server.use(
        CommitteeSessionStatusChangeRequestHandler,
        InvestigationListRequestHandler,
        ElectionRequestHandler,
        ElectionStatusRequestHandler,
      );
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ committeeSessionId: "1" });
    });

    test("Redirects to CommitteeSessionDetailsPage when details are not filled in", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "completed" }));

      renderPage();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/details#redirect-to-report");
      });
    });

    test("Shows page and click on back to overview", async () => {
      const user = userEvent.setup();
      const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
      const electionData = getElectionMockData(
        {},
        { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      );
      overrideOnce("get", "/api/elections/1", 200, electionData);

      const router = renderPage();

      expect(
        await screen.findByRole("heading", { level: 1, name: "Eerste zitting gemeentelijk stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
      expect(await screen.findByRole("button", { name: "Invoer hervatten" })).toBeVisible();

      const backButton = screen.getByRole("link", { name: "Terug naar overzicht" });
      expect(backButton).toBeVisible();
      await user.click(backButton);

      expect(statusChange).not.toHaveBeenCalled();
      expect(router.state.location.pathname).toEqual("/");
    });

    test("Shows page and click on resume data entry", async () => {
      const user = userEvent.setup();
      const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
      const electionData = getElectionMockData(
        {},
        { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      );
      overrideOnce("get", "/api/elections/1", 200, electionData);

      renderPage();

      expect(
        await screen.findByRole("heading", { level: 1, name: "Eerste zitting gemeentelijk stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

      const resumeButton = screen.getByRole("button", { name: "Invoer hervatten" });
      expect(resumeButton).toBeVisible();
      await user.click(resumeButton);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Terug naar invoerfase?");
      expect(title).toBeVisible();
      const saveButton = within(modal).getByRole("button", { name: "Invoer hervatten" });
      saveButton.click();

      await waitFor(() => {
        expect(statusChange).toHaveBeenCalledWith({ status: "data_entry" });
        expect(navigate).toHaveBeenCalledWith("../../status");
      });
    });

    test("Does not show resume data entry button when not current committee session", async () => {
      const committeeSessionData: Partial<CommitteeSession> = {
        status: "completed",
        location: "Den Haag",
        start_date_time: "2026-03-18T21:36:00",
      };
      const electionData = getElectionMockData({}, { id: 2, number: 2, ...committeeSessionData });
      electionData.committee_sessions = [
        getCommitteeSessionMockData({ id: 2, number: 2, ...committeeSessionData }),
        getCommitteeSessionMockData({ id: 1, number: 1, ...committeeSessionData }),
      ];
      overrideOnce("get", "/api/elections/1", 200, electionData);

      renderPage();

      expect(
        await screen.findByRole("heading", { level: 1, name: "Eerste zitting gemeentelijk stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Invoer hervatten" })).not.toBeInTheDocument();
    });

    test("Shows error page when resume data entry call returns an error", async () => {
      // error is expected
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = setupTestRouter([
        {
          Component: null,
          errorElement: <ErrorBoundary />,
          children: [
            {
              path: "elections/:electionId",
              children: electionManagementRoutes,
            },
          ],
        },
      ]);
      const user = userEvent.setup();
      const electionData = getElectionMockData(
        {},
        { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      );
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );
      overrideOnce("put", "/api/elections/1/committee_sessions/1/status", 409, {
        error: "Invalid committee session status",
        fatal: true,
        reference: "InvalidCommitteeSessionStatus",
      } satisfies ErrorResponse);

      await router.navigate("/elections/1/report/committee-session/1/download");

      rtlRender(<Providers router={router} />);

      expect(
        await screen.findByRole("heading", { level: 1, name: "Eerste zitting gemeentelijk stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Telresultaten eerste zitting gemeentelijk stembureau gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Download definitieve documenten eerste zitting/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

      const resumeButton = screen.getByRole("button", { name: "Invoer hervatten" });
      expect(resumeButton).toBeVisible();
      await user.click(resumeButton);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Terug naar invoerfase?");
      expect(title).toBeVisible();
      const saveButton = within(modal).getByRole("button", { name: "Invoer hervatten" });
      saveButton.click();

      await expectConflictErrorPage();
      expect(console.error).toHaveBeenCalled();
    });

    test("Error when committee session status is not Completed", async () => {
      // error is expected
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = setupTestRouter([
        {
          Component: null,
          errorElement: <ErrorBoundary />,
          children: [
            {
              path: "elections/:electionId",
              children: electionManagementRoutes,
            },
          ],
        },
      ]);

      overrideOnce(
        "get",
        "/api/elections/1",
        200,
        getElectionMockData({}, { status: "data_entry", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" }),
      );

      await router.navigate("/elections/1/report/committee-session/1/download");

      rtlRender(<Providers router={router} />);

      await expectConflictErrorPage();
      expect(console.error).toHaveBeenCalled();
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

      expect(await screen.findByText("In het ZIP-bestand zitten drie documenten:")).toBeInTheDocument();
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

      expect(await screen.findByText("In het ZIP-bestand zit één document:")).toBeInTheDocument();
      expect(await screen.findByRole("link", { name: /Download definitieve documenten tweede zitting/ })).toBeVisible();
    });
  });

  describe("CSB", () => {
    beforeEach(() => {
      server.use(
        CSBCommitteeSessionStatusChangeRequestHandler,
        CSBElectionRequestHandler,
        CSBElectionStatusRequestHandler,
      );
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ committeeSessionId: "2" });
    });

    test("Redirects to CommitteeSessionDetailsPage when details are not filled in", async () => {
      overrideOnce("get", "/api/elections/2", 200, getCSBElectionMockData({}, { status: "completed" }));

      renderPage("CSB");

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/2/details#redirect-to-report");
      });
    });

    test("Shows page and click on back to overview", async () => {
      const user = userEvent.setup();
      const statusChange = spyOnHandler(CSBCommitteeSessionStatusChangeRequestHandler);
      overrideOnce("get", "/api/elections/2/committee_sessions/2/status", 200, getCSBElectionMockData({}, {}));

      const electionData = getCSBElectionMockData(
        {},
        { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      );
      overrideOnce("get", "/api/elections/2", 200, electionData);

      const router = renderPage("CSB");

      expect(
        await screen.findByRole("heading", { level: 1, name: "Proces-verbaal centraal stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Zetelverdeling gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Vaststelling uitslag/ })).toBeVisible();
      // Disabled for now: https://github.com/kiesraad/abacus/issues/2967
      // expect(await screen.findByRole("link", { name: /Model-p22-2-bijlage/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: /Definitieve documenten/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
      expect(await screen.findByRole("button", { name: "Invoer hervatten" })).toBeVisible();

      const backButton = screen.getByRole("link", { name: "Terug naar overzicht" });
      expect(backButton).toBeVisible();
      await user.click(backButton);

      expect(statusChange).not.toHaveBeenCalled();
      expect(router.state.location.pathname).toEqual("/");
    });

    test("Shows page and click on resume data entry", async () => {
      const user = userEvent.setup();
      const statusChange = spyOnHandler(CSBCommitteeSessionStatusChangeRequestHandler);
      const electionData = getCSBElectionMockData(
        {},
        { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      );
      overrideOnce("get", "/api/elections/2", 200, electionData);

      renderPage("CSB");

      expect(
        await screen.findByRole("heading", { level: 1, name: "Proces-verbaal centraal stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Zetelverdeling gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Vaststelling uitslag/ })).toBeVisible();
      // Disabled for now: https://github.com/kiesraad/abacus/issues/2967
      //expect(await screen.findByRole("link", { name: /Model-p22-2-bijlage/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: /Definitieve documenten/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

      const resumeButton = screen.getByRole("button", { name: "Invoer hervatten" });
      expect(resumeButton).toBeVisible();
      await user.click(resumeButton);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Terug naar invoerfase?");
      expect(title).toBeVisible();
      const saveButton = within(modal).getByRole("button", { name: "Invoer hervatten" });
      saveButton.click();

      await waitFor(() => {
        expect(statusChange).toHaveBeenCalledWith({ status: "data_entry" });
        expect(navigate).toHaveBeenCalledWith("../../status");
      });
    });

    test("Does not show resume data entry button when not current committee session", async () => {
      const committeeSessionData: Partial<CommitteeSession> = {
        status: "completed",
        location: "Den Haag",
        start_date_time: "2026-03-18T21:36:00",
      };
      const electionData = getCSBElectionMockData({}, { id: 4, number: 2, ...committeeSessionData });
      electionData.committee_sessions = [
        getCSBCommitteeSessionMockData({ id: 4, number: 2, ...committeeSessionData }),
        getCSBCommitteeSessionMockData({ id: 2, number: 1, ...committeeSessionData }),
      ];
      overrideOnce("get", "/api/elections/2", 200, electionData);

      renderPage("CSB");

      expect(
        await screen.findByRole("heading", { level: 1, name: "Proces-verbaal centraal stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Zetelverdeling gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Vaststelling uitslag/ })).toBeVisible();
      // Disabled for now: https://github.com/kiesraad/abacus/issues/2967
      // expect(await screen.findByRole("link", { name: /Model-p22-2-bijlage/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: /Definitieve documenten/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Invoer hervatten" })).not.toBeInTheDocument();
    });

    test("Shows error page when resume data entry call returns an error", async () => {
      // error is expected
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = setupTestRouter([
        {
          Component: null,
          errorElement: <ErrorBoundary />,
          children: [
            {
              path: "elections/:electionId",
              children: electionManagementRoutes,
            },
          ],
        },
      ]);
      const user = userEvent.setup();
      const electionData = getCSBElectionMockData(
        {},
        { status: "completed", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
      );
      server.use(
        http.get("/api/elections/2", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );
      overrideOnce("put", "/api/elections/2/committee_sessions/2/status", 409, {
        error: "Invalid committee session status",
        fatal: true,
        reference: "InvalidCommitteeSessionStatus",
      } satisfies ErrorResponse);

      await router.navigate("/elections/2/report/committee-session/1/download");

      rtlRender(<Providers committeeCategory={"CSB"} router={router} />);

      expect(
        await screen.findByRole("heading", { level: 1, name: "Proces-verbaal centraal stembureau" }),
      ).toBeVisible();
      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Zetelverdeling gemeente Heemdamseburg",
        }),
      ).toBeVisible();
      expect(await screen.findByRole("link", { name: /Vaststelling uitslag/ })).toBeVisible();
      // Disabled for now: https://github.com/kiesraad/abacus/issues/2967
      // expect(await screen.findByRole("link", { name: /Model-p22-2-bijlage/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: /Definitieve documenten/ })).toBeVisible();
      expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

      const resumeButton = screen.getByRole("button", { name: "Invoer hervatten" });
      expect(resumeButton).toBeVisible();
      await user.click(resumeButton);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Terug naar invoerfase?");
      expect(title).toBeVisible();
      const saveButton = within(modal).getByRole("button", { name: "Invoer hervatten" });
      saveButton.click();

      await expectConflictErrorPage();
      expect(console.error).toHaveBeenCalled();
    });

    test("Error when committee session status is not Completed", async () => {
      // error is expected
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = setupTestRouter([
        {
          Component: null,
          errorElement: <ErrorBoundary />,
          children: [
            {
              path: "elections/:electionId",
              children: electionManagementRoutes,
            },
          ],
        },
      ]);

      overrideOnce(
        "get",
        "/api/elections/2",
        200,
        getCSBElectionMockData(
          {},
          { status: "data_entry", location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
        ),
      );

      await router.navigate("/elections/2/report/committee-session/2/download");

      rtlRender(<Providers committeeCategory={"CSB"} router={router} />);

      await expectConflictErrorPage();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
