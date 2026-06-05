import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  DeleteDeceasedCandidateRequestHandler,
  FinaliseDeceasedCandidatesRequestHandler,
  GetApportionmentStateRequestHandler,
  ResetApportionmentStateRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import type { Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import {
  expectErrorPage,
  render,
  renderReturningRouter,
  screen,
  setupTestRouter,
  spyOnHandler,
  waitFor,
  within,
} from "@/testing/test-utils";
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
import { DeceasedCandidatesPage } from "./DeceasedCandidatesPage";

const navigate = vi.fn();

const renderDeceasedCandidatesPage = (electionId: number, withRouter: boolean) => {
  const component = (
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <DeceasedCandidatesPage />
      </ApportionmentProvider>
    </ElectionProvider>
  );
  if (withRouter) {
    return renderReturningRouter(component);
  } else {
    return render(component);
  }
};

describe("DeceasedCandidatesPage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(election, committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    server.use(GetApportionmentStateRequestHandler);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [{ pg_number: 1, candidate_number: 1 }],
      type: "RegisteringDeceasedCandidates",
    });
  });

  test.each(
    Object.values({
      Uninitialised: {
        state: { type: "Uninitialised" },
        expectRedirectTo: "/elections/3/apportionment/include-all-candidates",
      },
      RegisteringDeceasedCandidates: {
        state: { deceased_candidates: [], type: "RegisteringDeceasedCandidates" },
        expectRedirectTo: undefined,
      },
      Finalised: {
        state: { deceased_candidates: [], type: "Finalised" },
        expectRedirectTo: undefined,
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectRedirectTo: string | undefined }
    >),
  )("Does not redirect only for uninitialised state ($state.type)", async ({ state, expectRedirectTo }) => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, state);

    renderDeceasedCandidatesPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test("Renders table and clicking delete on a deceased candidate works", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(DeleteDeceasedCandidateRequestHandler);
    const deleteDeceasedCandidate = spyOnHandler(DeleteDeceasedCandidateRequestHandler);
    const user = userEvent.setup();

    renderDeceasedCandidatesPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    expect(
      await screen.findByText(
        "Geef aan welke kandidaat of kandidaten als gevolg van overlijden bij de zetelverdeling buiten beschouwing moeten worden gelaten.",
      ),
    ).toBeVisible();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Overleden kandidaat", "Lijst", "Positie op lijst", ""],
      ["Oud, L. (Lidewij) †", "Lijst 1 - Political Group A", "1", "Verwijderen"],
    ]);

    // Check if the delete link works
    const rows = within(table).getAllByRole("row");
    if (rows[1]) {
      const deleteLink = await within(rows[1]).findByRole("button", { name: "Verwijderen" });
      await user.click(deleteLink);
      expect(deleteDeceasedCandidate).toHaveBeenCalledWith({ pg_number: 1, candidate_number: 1 });
    }
  });

  test("Renders read-only table for state Finalised and resets on clicking redo apportionment", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(ResetApportionmentStateRequestHandler);
    const resetApportionmentState = spyOnHandler(ResetApportionmentStateRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [{ pg_number: 1, candidate_number: 1 }],
      type: "Finalised",
    });
    const user = userEvent.setup();

    renderDeceasedCandidatesPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    expect(
      await screen.findByText(
        "De zetelverdeling is al berekend. Onderstaande kandidaten zijn als gevolg van overlijden bij de zetelverdeling buiten beschouwing gelaten.",
      ),
    ).toBeVisible();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Overleden kandidaat", "Lijst", "Positie op lijst"],
      ["Oud, L. (Lidewij) †", "Lijst 1 - Political Group A", "1"],
    ]);

    expect(screen.queryByRole("button", { name: "+ Kandidaat toevoegen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Naar zetelverdeling" })).not.toBeInTheDocument();

    expect(
      await screen.findByText("Wil je wijzigingen aanbrengen in de buiten beschouwing gelaten kandidaten?"),
    ).toBeVisible();
    const resetButton = await screen.findByRole("button", { name: "Doe dan de zetelverdeling opnieuw" });
    expect(resetButton).toBeVisible();
    await user.click(resetButton);

    expect(resetApportionmentState).toHaveBeenCalled();
    expect(getApportionmentState).toHaveBeenCalled();
  });

  test("Renders no table for state Finalised and no deceased candidates and resets on clicking redo apportionment", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(ResetApportionmentStateRequestHandler);
    const resetApportionmentState = spyOnHandler(ResetApportionmentStateRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [],
      type: "Finalised",
    });
    const user = userEvent.setup();

    renderDeceasedCandidatesPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    expect(
      await screen.findByText(
        "De zetelverdeling is al berekend. Alle kandidaten zijn meegenomen bij het verdelen van de zetels. Er zijn geen kandidaten buiten beschouwing gelaten vanwege overlijden.",
      ),
    ).toBeVisible();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Kandidaat toevoegen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Naar zetelverdeling" })).not.toBeInTheDocument();

    expect(
      await screen.findByText("Wil je wijzigingen aanbrengen in de buiten beschouwing gelaten kandidaten?"),
    ).toBeVisible();
    const resetButton = await screen.findByRole("button", { name: "Doe dan de zetelverdeling opnieuw" });
    expect(resetButton).toBeVisible();
    await user.click(resetButton);

    expect(resetApportionmentState).toHaveBeenCalled();
    expect(getApportionmentState).toHaveBeenCalled();
  });

  test("Renders add button and clicking it redirects to AddDeceasedCandidatePage", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    const user = userEvent.setup();

    const router = renderDeceasedCandidatesPage(3, true) as Router;
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    expect(await screen.findByRole("table")).toBeVisible();

    const addDeceasedCandidate = await screen.findByRole("link", { name: "+ Kandidaat toevoegen" });
    expect(addDeceasedCandidate).toBeVisible();
    await user.click(addDeceasedCandidate);
    expect(router.state.location.pathname).toEqual("/elections/3/apportionment/deceased-candidates/add");
  });

  test("Clicking To apportionment button finalises deceased candidates and redirects to ApportionmentPage", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(FinaliseDeceasedCandidatesRequestHandler);
    const finaliseDeceasedCandidates = spyOnHandler(FinaliseDeceasedCandidatesRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    const user = userEvent.setup();

    renderDeceasedCandidatesPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    expect(await screen.findByRole("table")).toBeVisible();

    const finaliseButton = await screen.findByRole("button", { name: "Naar zetelverdeling" });
    expect(finaliseButton).toBeVisible();
    await user.click(finaliseButton);

    expect(finaliseDeceasedCandidates).toHaveBeenCalled();
    expect(getApportionmentState).toHaveBeenCalled();
  });

  test("Clicking To apportionment button when no deceased candidates, finalises deceased candidates and redirects to ApportionmentPage", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(FinaliseDeceasedCandidatesRequestHandler);
    const finaliseDeceasedCandidates = spyOnHandler(FinaliseDeceasedCandidatesRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [],
      type: "RegisteringDeceasedCandidates",
    });
    const user = userEvent.setup();

    renderDeceasedCandidatesPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const finaliseButton = await screen.findByRole("button", { name: "Naar zetelverdeling" });
    expect(finaliseButton).toBeVisible();
    await user.click(finaliseButton);

    expect(finaliseDeceasedCandidates).toHaveBeenCalled();
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

      renderDeceasedCandidatesPage(3, false);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaten" }));

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

      await router.navigate("/elections/3/apportionment/deceased-candidates");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});
