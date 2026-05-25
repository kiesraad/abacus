import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  AddDeceasedCandidateRequestHandler,
  GetApportionmentStateRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, spyOnHandler, waitFor, within } from "@/testing/test-utils";
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
import { AddDeceasedCandidatePage } from "./AddDeceasedCandidatePage";

const navigate = vi.fn();

const renderAddDeceasedCandidatePage = (electionId: number) => {
  return render(
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <AddDeceasedCandidatePage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );
};

describe("AddDeceasedCandidatesPage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(election, committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
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
        expectRedirectTo: "/elections/3/apportionment",
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectRedirectTo: string | undefined }
    >),
  )("Does not redirect only for uninitialised state ($state.type)", async ({ state, expectRedirectTo }) => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, state);

    renderAddDeceasedCandidatePage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaat" }));

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test("Renders table and clicking on a candidate works", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(AddDeceasedCandidateRequestHandler);
    const addDeceasedCandidate = spyOnHandler(AddDeceasedCandidateRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    const user = userEvent.setup();

    renderAddDeceasedCandidatePage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaat" }));

    expect(await screen.findByRole("heading", { level: 3, name: "Lijst 1 - Political Group A" }));

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Kandidaat"],
      ["1", "Oud, L. (Lidewij) †"],
      ["2", "Oud, J. (Johan)"],
      ["3", "Oud, M. (Marijke)"],
      ["4", "Jansen, A. (Arie)"],
      ["5", "Van der Weijden, H. (Henk)"],
      ["6", "Van der Weijden, B. (Berta)"],
      ["7", "Oud, K. (Klaas)"],
      ["8", "Bakker, S. (Sophie)"],
      ["9", "De Vries, J. (Johan)"],
      ["10", "Van den Berg, M. (Marijke)"],
      ["11", "De Jong, R. (Rolf)"],
      ["12", "Kok, K. (Karin)"],
    ]);

    // Check if clicking the row works
    const rows = within(table).getAllByRole("row");
    if (rows[2]) {
      await user.click(rows[2]);
      expect(addDeceasedCandidate).toHaveBeenCalledWith({ pg_number: 1, candidate_number: 2 });
      expect(getApportionmentState).toHaveBeenCalled();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/elections/3/apportionment/deceased-candidates");
      });
    }
  });

  test("Renders table for different list and clicking on a candidate works", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(AddDeceasedCandidateRequestHandler);
    const addDeceasedCandidate = spyOnHandler(AddDeceasedCandidateRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    const user = userEvent.setup();

    renderAddDeceasedCandidatePage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaat" }));

    const group1 = await screen.findByTestId("list-item-group-1");
    const group2 = await screen.findByTestId("list-item-group-2");
    const group3 = await screen.findByTestId("list-item-group-3");
    const group4 = await screen.findByTestId("list-item-group-4");
    const group5 = await screen.findByTestId("list-item-group-5");
    const group6 = await screen.findByTestId("list-item-group-6");
    const group7 = await screen.findByTestId("list-item-group-7");
    const group8 = await screen.findByTestId("list-item-group-8");

    expect(group1).toHaveClass("active");
    expect(group1).toHaveAttribute("aria-current", "step");
    const group1Icon = within(group1).getByRole("img");
    expect(group1Icon).toHaveAccessibleName("je bent hier");

    expect(group2).toHaveClass("idle");
    expect(group2).toHaveAttribute("aria-current", "false");
    expect(within(group2).queryByRole("img")).not.toBeInTheDocument();

    expect(group3).toHaveClass("idle");
    expect(group3).toHaveAttribute("aria-current", "false");
    expect(within(group3).queryByRole("img")).not.toBeInTheDocument();

    expect(group4).toHaveClass("idle");
    expect(group4).toHaveAttribute("aria-current", "false");
    expect(within(group4).queryByRole("img")).not.toBeInTheDocument();

    expect(group5).toHaveClass("idle");
    expect(group5).toHaveAttribute("aria-current", "false");
    expect(within(group5).queryByRole("img")).not.toBeInTheDocument();

    expect(group6).toHaveClass("idle");
    expect(group6).toHaveAttribute("aria-current", "false");
    expect(within(group6).queryByRole("img")).not.toBeInTheDocument();

    expect(group7).toHaveClass("idle");
    expect(group7).toHaveAttribute("aria-current", "false");
    expect(within(group7).queryByRole("img")).not.toBeInTheDocument();

    expect(group8).toHaveClass("idle");
    expect(group8).toHaveAttribute("aria-current", "false");
    expect(within(group8).queryByRole("img")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Lijst 1 - Political Group A" }));

    await user.click(group2);

    expect(group1).toHaveClass("idle");
    expect(group1).toHaveAttribute("aria-current", "false");
    expect(within(group1).queryByRole("img")).not.toBeInTheDocument();

    expect(group2).toHaveClass("active");
    expect(group2).toHaveAttribute("aria-current", "step");
    const group2Icon = within(group2).getByRole("img");
    expect(group2Icon).toHaveAccessibleName("je bent hier");

    expect(await screen.findByRole("heading", { level: 3, name: "Lijst 2 - Political Group B" }));

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Kandidaat"],
      ["1", "Bakker, T. (Tinus)"],
      ["2", "Po, D."],
      ["3", "De Vries, W. (Willem)"],
      ["4", "Kloosterboer, K. (Klaas)"],
      ["5", "Jansen, L. (Liesbeth)"],
      ["6", "Van den Berg, H. (Henk)"],
    ]);

    // Check if clicking the row works
    const rows = within(table).getAllByRole("row");
    if (rows[6]) {
      await user.click(rows[6]);
      expect(addDeceasedCandidate).toHaveBeenCalledWith({ pg_number: 2, candidate_number: 6 });
      expect(getApportionmentState).toHaveBeenCalled();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/elections/3/apportionment/deceased-candidates");
      });
    }
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

      renderAddDeceasedCandidatePage(3);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Overleden kandidaat" }));

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

      await router.navigate("/elections/3/apportionment/add-deceased-candidates");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});
