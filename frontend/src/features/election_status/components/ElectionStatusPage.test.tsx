import * as ReactRouter from "react-router";

import { render as rtlRender, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionStatusLayout } from "@/components/layout/ElectionStatusLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import {
  expectConflictErrorPage,
  expectForbiddenErrorPage,
  screen,
  setupTestRouter,
  spyOnHandler,
} from "@/testing/test-utils";
import { getAdminUser, getCoordinatorUser, getTypistUser } from "@/testing/user-mock-data";
import {
  ElectionDetailsResponse,
  ElectionStatusResponse,
  ErrorResponse,
  LoginResponse,
} from "@/types/generated/openapi";

import { electionStatusRoutes } from "../routes";

const navigate = vi.fn();

async function renderPage() {
  // Set up router and navigate to the election data entry status page
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "status",
          Component: ElectionStatusLayout,
          children: electionStatusRoutes,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/status");
  rtlRender(<Providers router={router} />);

  return router;
}

describe("ElectionStatusPage", () => {
  beforeEach(() => {
    server.use(
      CommitteeSessionStatusChangeRequestHandler,
      ElectionListRequestHandler,
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      UserListRequestHandler,
    );
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test.each<LoginResponse>([getCoordinatorUser(), getAdminUser()])(
    "Page render when committee session status is created for user: %s",
    async (loginResponse) => {
      vi.spyOn(useUser, "useUser").mockReturnValue(loginResponse);
      const user = userEvent.setup();
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(getElectionMockData({}, { status: "created" }) satisfies ElectionDetailsResponse, {
            status: 200,
          }),
        ),
      );

      await renderPage();

      // Test that the data entry finished and data entry paused alerts don't exist
      expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
      expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

      expect(await screen.findByText("Zitting voorbereiden")).toBeVisible();

      const pollingStationsButton = screen.getByRole("button", { name: "Stembureaus" });
      expect(pollingStationsButton).toBeVisible();

      await user.click(pollingStationsButton);

      expect(navigate).toHaveBeenCalledWith("/elections/1/polling-stations");
    },
  );

  test("Page render when committee session status is data_entry_not_started for coordinator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(
          getElectionMockData({}, { status: "data_entry_not_started" }) satisfies ElectionDetailsResponse,
          { status: 200 },
        ),
      ),
    );

    await renderPage();

    // Test that the data entry finished and data entry paused alerts don't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

    expect(await screen.findByText("Klaar voor steminvoer")).toBeVisible();
    const startLink = screen.getByRole("button", { name: "Starten" });
    expect(startLink).toBeVisible();

    await user.click(startLink);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).not.toHaveBeenCalled();
  });

  test("Page render when committee session status is data_entry_not_started for administrator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getAdminUser());
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(
          getElectionMockData({}, { status: "data_entry_not_started" }) satisfies ElectionDetailsResponse,
          { status: 200 },
        ),
      ),
    );

    await renderPage();

    // Test that the data entry finished and data entry paused alerts don't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

    expect(await screen.findByText("Klaar voor steminvoer")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Starten" })).not.toBeInTheDocument();
  });

  test("Page render when committee session status is data_entry_in_progress for coordinator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);

    await renderPage();

    // Test that the data entry finished and data entry paused alerts don't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

    expect(await screen.findByText("Steminvoer bezig")).toBeVisible();
    const pauseLink = screen.getByRole("button", { name: "Pauzeren" });
    expect(pauseLink).toBeVisible();

    await user.click(pauseLink);
    let modal = await screen.findByRole("dialog");

    const cancelButtons = within(modal).getAllByRole("button", { name: "Annuleren" });
    expect(cancelButtons[0]).toBeVisible();
    expect(cancelButtons[1]).toBeVisible();
    await user.click(cancelButtons[1]!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(pauseLink);
    modal = await screen.findByRole("dialog");

    const pauseButton = within(modal).getByRole("button", { name: "Pauzeren" });
    expect(pauseButton).toBeVisible();
    await user.click(pauseButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_paused" });
    expect(navigate).not.toHaveBeenCalled();
  });

  test("Page render when committee session status is data_entry_in_progress for administrator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getAdminUser());

    await renderPage();

    // Test that the data entry finished and data entry paused alerts don't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

    expect(await screen.findByText("Steminvoer bezig")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pauzeren" })).not.toBeInTheDocument();
  });

  test("Finish input alert visible when data entry has finished for coordinator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const user = userEvent.setup();
    server.use(
      http.get("/api/elections/1/status", () =>
        HttpResponse.json(
          {
            statuses: [
              { polling_station_id: 1, status: "definitive" },
              { polling_station_id: 2, status: "definitive" },
            ],
          } satisfies ElectionStatusResponse,
          { status: 200 },
        ),
      ),
    );

    await renderPage();

    // Test that the data entry paused alert doesn't exist
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
    const finishButton = screen.getByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();

    await user.click(finishButton);

    expect(navigate).toHaveBeenCalledWith("../report");
  });

  test("Finish input alert not visible when data entry has finished for administrator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getAdminUser());
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { polling_station_id: 1, status: "definitive" },
        { polling_station_id: 2, status: "definitive" },
      ],
    });

    await renderPage();

    // Test that the data entry finished and data entry paused alerts don't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();
  });

  test("Finish input alert visible when data entry has finished and data entry is paused for coordinator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const user = userEvent.setup();
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(getElectionMockData({}, { status: "data_entry_paused" }) satisfies ElectionDetailsResponse, {
          status: 200,
        }),
      ),
    );
    server.use(
      http.get("/api/elections/1/status", () =>
        HttpResponse.json(
          {
            statuses: [
              { polling_station_id: 1, status: "definitive" },
              { polling_station_id: 2, status: "definitive" },
            ],
          } satisfies ElectionStatusResponse,
          { status: 200 },
        ),
      ),
    );

    await renderPage();

    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();
    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
    const finishButton = screen.getByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();

    await user.click(finishButton);

    expect(navigate).toHaveBeenCalledWith("../report");
  });

  test("Page render when committee session status is data_entry_paused for coordinator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(getElectionMockData({}, { status: "data_entry_paused" }) satisfies ElectionDetailsResponse, {
          status: 200,
        }),
      ),
    );

    await renderPage();

    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(await screen.findByText("Het invoeren van stemmen is gepauzeerd")).toBeVisible();
    const resumeButton = screen.getByRole("button", { name: "Steminvoer hervatten" });
    expect(resumeButton).toBeVisible();

    await user.click(resumeButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).not.toHaveBeenCalled();

    expect(await screen.findByText("Steminvoer gepauzeerd")).toBeVisible();
    const resumeLink = screen.getByRole("button", { name: "Hervatten" });
    expect(resumeLink).toBeVisible();

    await user.click(resumeLink);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).not.toHaveBeenCalled();
  });

  test("Page render when committee session status is data_entry_paused for administrator", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getAdminUser());
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(getElectionMockData({}, { status: "data_entry_paused" }) satisfies ElectionDetailsResponse, {
          status: 200,
        }),
      ),
    );

    await renderPage();

    // Test that the data entry finished and data entry paused alerts don't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

    expect(await screen.findByText("Steminvoer gepauzeerd")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Hervatten" })).not.toBeInTheDocument();
  });

  test.each<LoginResponse>([getCoordinatorUser(), getAdminUser()])(
    "Page render when committee session status is data_entry_finished for role: %s",
    async (loginResponse) => {
      vi.spyOn(useUser, "useUser").mockReturnValue(loginResponse);
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(
            getElectionMockData({}, { status: "data_entry_finished" }) satisfies ElectionDetailsResponse,
            { status: 200 },
          ),
        ),
      );
      overrideOnce("get", "/api/elections/1/status", 200, {
        statuses: [
          { polling_station_id: 1, status: "definitive" },
          { polling_station_id: 2, status: "definitive" },
        ],
      });

      await renderPage();

      // Test that the data entry finished and data entry paused alerts don't exist
      expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
      expect(screen.queryByText("Het invoeren van stemmen is gepauzeerd")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Steminvoer hervatten" })).not.toBeInTheDocument();

      expect(await screen.findByText("Steminvoer afgerond")).toBeVisible();
    },
  );

  test("Shows error page when user is not allowed to view the page", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
    overrideOnce("get", "/api/user", 403, {
      error: "Forbidden",
      fatal: true,
      reference: "Forbidden",
    } satisfies ErrorResponse);

    await renderPage();

    await expectForbiddenErrorPage();
  });

  test("Shows error page when election status change call returns an error", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(getElectionMockData({}, { status: "data_entry_paused" }) satisfies ElectionDetailsResponse, {
          status: 200,
        }),
      ),
    );
    overrideOnce("put", "/api/elections/1/committee_sessions/1/status", 409, {
      error: "Invalid committee session status",
      fatal: true,
      reference: "InvalidCommitteeSessionStatus",
    } satisfies ErrorResponse);

    await renderPage();

    expect(await screen.findByText("Het invoeren van stemmen is gepauzeerd")).toBeVisible();
    const resumeButton = screen.getByRole("button", { name: "Steminvoer hervatten" });
    expect(resumeButton).toBeVisible();

    await user.click(resumeButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).not.toHaveBeenCalled();

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });

  test("Clicking progress status scrolls corresponding table into view via element link", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());

    await renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" })).toBeVisible();

    const navigations = screen.getAllByRole("navigation");
    const statusLinks = within(navigations[1]!).getAllByRole("link");

    expect(statusLinks[0]!.textContent).toEqual("Fouten en waarschuwingen (2)");
    statusLinks[0]!.click();
    await waitFor(() => {
      expect(window.location.hash).toEqual("#item-table-errors-and-warnings");
    });

    expect(statusLinks[1]!.textContent).toEqual("Invoer bezig (2)");
    statusLinks[1]!.click();
    await waitFor(() => {
      expect(window.location.hash).toEqual("#item-table-in-progress");
    });

    expect(statusLinks[2]!.textContent).toEqual("Eerste invoer klaar (1)");
    statusLinks[2]!.click();
    await waitFor(() => {
      expect(window.location.hash).toEqual("#item-table-first-entry-finished");
    });

    expect(statusLinks[3]!.textContent).toEqual("Eerste en tweede invoer klaar (1)");
    statusLinks[3]!.click();
    await waitFor(() => {
      expect(window.location.hash).toEqual("#item-table-definitive");
    });

    expect(statusLinks[4]!.textContent).toEqual("Werkvoorraad (2)");
    statusLinks[4]!.click();
    await waitFor(() => {
      expect(window.location.hash).toEqual("#item-table-not-started");
    });
  });

  test("Refetches data every 30 seconds", async () => {
    vi.useFakeTimers();
    await renderPage();

    // Wait for the page to be loaded
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();
    });

    const electionRequestSpy = spyOnHandler(ElectionRequestHandler);
    const electionStatusRequestSpy = spyOnHandler(ElectionStatusRequestHandler);

    // Test 3 intervals of 30 seconds each
    for (let i = 1; i <= 3; i++) {
      vi.advanceTimersByTime(30_000);

      await vi.waitFor(() => {
        expect(electionRequestSpy).toHaveBeenCalledTimes(i);
        expect(electionStatusRequestSpy).toHaveBeenCalledTimes(i);
      });
    }

    vi.useRealTimers();
  });
});
