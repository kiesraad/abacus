import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  GetApportionmentStateRequestHandler,
  RegisterDeceasedCandidatesRequestHandler,
  SkipDeceasedCandidatesRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, spyOnHandler, waitFor } from "@/testing/test-utils";
import type { ApportionmentState, ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";
import { apportionmentRoutes } from "../../routes";
import {
  candidate_nomination,
  committee_session,
  election,
  election_summary,
  seat_assignment,
} from "../../testing/lt-19-seats";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { IncludeAllCandidatesPage } from "./IncludeAllCandidatesPage";

const navigate = vi.fn();

const renderIncludeAllCandidatesPage = (electionId: number) =>
  render(
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <IncludeAllCandidatesPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("IncludeAllCandidatesPage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(election, committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    server.use(GetApportionmentStateRequestHandler);
  });

  test.each(
    Object.values({
      Uninitialised: {
        state: { type: "Uninitialised" },
        expectRedirectTo: undefined,
      },
      RegisteringDeceasedCandidates: {
        state: { deceased_candidates: [], type: "RegisteringDeceasedCandidates" },
        expectRedirectTo: "/elections/3/apportionment/deceased-candidates/add",
      },
      DrawingLots: {
        state: {
          deceased_candidates: [],
          drawing_lots_required: { variant: "AbsoluteMajority", options: [1, 2], type: "ListDrawingLotsRequired" },
          candidates_drawn: [],
          lists_drawn: [],
          type: "DrawingLots",
        },
        expectRedirectTo: "/elections/3/apportionment",
      },
      Finalised: {
        state: { deceased_candidates: [], lists_drawn: [], candidates_drawn: [], type: "Finalised" },
        expectRedirectTo: "/elections/3/apportionment",
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectRedirectTo: string | undefined }
    >),
  )("Does not redirect only for uninitialised state ($state.type)", async ({ state, expectRedirectTo }) => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, state);

    renderIncludeAllCandidatesPage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test("Redirects to DeceasedCandidatesPage when state RegisteringDeceasedCandidates and any deceased candidates", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [{ pg_number: 1, candidate_number: 1 }],
      type: "RegisteringDeceasedCandidates",
    });

    renderIncludeAllCandidatesPage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/3/apportionment/deceased-candidates");
    });
  });

  test("Renders form and shows error when submitting without selecting yes or no", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(SkipDeceasedCandidatesRequestHandler);
    server.use(RegisterDeceasedCandidatesRequestHandler);
    const skipDeceasedCandidates = spyOnHandler(SkipDeceasedCandidatesRequestHandler);
    const registerDeceasedCandidates = spyOnHandler(RegisterDeceasedCandidatesRequestHandler);
    const user = userEvent.setup();

    renderIncludeAllCandidatesPage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

    const noDeceased = await screen.findByRole("radio", { name: "Er zijn geen overleden kandidaten" });
    const hasDeceased = await screen.findByRole("radio", { name: "Eén of meerdere kandidaten zijn overleden" });
    expect(noDeceased).toBeVisible();
    expect(noDeceased).not.toBeChecked();
    expect(hasDeceased).toBeVisible();
    expect(hasDeceased).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(await screen.findByText("Deze vraag is verplicht")).toBeVisible();

    expect(skipDeceasedCandidates).not.toHaveBeenCalled();
    expect(registerDeceasedCandidates).not.toHaveBeenCalled();
  });

  test("Submits and redirects to ApportionmentPage when selecting yes", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(SkipDeceasedCandidatesRequestHandler);
    const skipDeceasedCandidates = spyOnHandler(SkipDeceasedCandidatesRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    const user = userEvent.setup();

    renderIncludeAllCandidatesPage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

    const noDeceased = await screen.findByRole("radio", { name: "Er zijn geen overleden kandidaten" });
    expect(noDeceased).toBeVisible();
    await user.click(noDeceased);
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(skipDeceasedCandidates).toHaveBeenCalled();
    expect(getApportionmentState).toHaveBeenCalled();
  });

  test("Submits and redirects to AddDeceasedCandidatePage when selecting no", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(RegisterDeceasedCandidatesRequestHandler);
    const registerDeceasedCandidates = spyOnHandler(RegisterDeceasedCandidatesRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    const user = userEvent.setup();

    renderIncludeAllCandidatesPage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

    const hasDeceased = await screen.findByRole("radio", { name: "Eén of meerdere kandidaten zijn overleden" });
    expect(hasDeceased).toBeVisible();
    await user.click(hasDeceased);
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(registerDeceasedCandidates).toHaveBeenCalled();
    expect(getApportionmentState).toHaveBeenCalled();
  });

  describe("Apportionment not yet available", () => {
    test("Not available until committee session is completed", async () => {
      overrideOnce("post", "/api/elections/3/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);
      overrideOnce("get", "/api/elections/3/apportionment/state", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderIncludeAllCandidatesPage(3);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();
    });

    test("Internal Server Error renders error page", async () => {
      // error is expected
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = setupTestRouter([
        {
          Component: null,
          errorElement: <ErrorBoundary />,
          children: [
            {
              path: "elections/:electionId/apportionment",
              children: apportionmentRoutes,
            },
          ],
        },
      ]);

      overrideOnce("post", "/api/elections/3/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });
      overrideOnce("post", "/api/elections/3/apportionment/state", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/3/apportionment/include-all-candidates");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});
