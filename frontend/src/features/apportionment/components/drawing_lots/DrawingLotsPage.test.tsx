import { render as rtlRender } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { ApportionmentState, ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";
import { apportionmentRoutes } from "../../routes";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP7 from "../../testing/lt-19-seats-and-p7";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { DrawingLotsPage } from "./DrawingLotsPage";

const navigate = vi.fn();

const renderDrawingLotsPage = (electionId: number) =>
  render(
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <DrawingLotsPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("DrawingLotsPage", () => {
  test.each(
    Object.values({
      Uninitialised: {
        state: { type: "Uninitialised" },
        expectRedirectTo: "/elections/3/apportionment/include-all-candidates",
      },
      RegisteringDeceasedCandidates: {
        state: { deceased_candidates: [], type: "RegisteringDeceasedCandidates" },
        expectRedirectTo: "/elections/3/apportionment/deceased-candidates",
      },
      DrawingLots: {
        state: {
          deceased_candidates: [],
          drawing_lots_required: {
            variant: "HighestAverageResidualSeat",
            options: [1, 2],
            list_averages: [
              {
                average: {
                  denominator: 0,
                  integer: 0,
                  numerator: 0,
                },
                pg_number: 1,
              },
              {
                average: {
                  denominator: 0,
                  integer: 0,
                  numerator: 0,
                },
                pg_number: 2,
              },
            ],
            max_average: {
              denominator: 0,
              integer: 0,
              numerator: 0,
            },
            residual_seat_numbers: [2],
            type: "ListDrawingLotsRequired",
          },
          candidates_drawn: [],
          lists_drawn: [],
          type: "DrawingLots",
        },
        expectRedirectTo: undefined,
      },
      Finalised: {
        state: { deceased_candidates: [], lists_drawn: [], candidates_drawn: [], type: "Finalised" },
        expectRedirectTo: "/elections/3/apportionment",
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectRedirectTo: string | undefined }
    >),
  )("Does not redirect only for drawing lots state ($state.type)", async ({ state, expectRedirectTo }) => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, state);

    renderDrawingLotsPage(3);

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(await screen.findByRole("heading", { level: 1, name: "Loting voor restzetel 2" }));
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  describe("Apportionment not yet available", () => {
    beforeEach(() => {
      overrideOnce(
        "get",
        "/api/elections/7",
        200,
        getElectionMockData(lt19SeatsAndP7.election, lt19SeatsAndP7.committee_session),
      );
      overrideOnce("get", "/api/elections/7/apportionment/state", 200, lt19SeatsAndP7.state);
    });

    test("Not available until committee session is completed", async () => {
      overrideOnce("post", "/api/elections/7/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderDrawingLotsPage(7);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Loting" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByTestId("full-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual-seats-calculation-table")).not.toBeInTheDocument();
    });

    test("Not possible because committee session is not completed yet", async () => {
      overrideOnce("post", "/api/elections/7/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderDrawingLotsPage(7);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Loting" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByTestId("full-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual-seats-calculation-table")).not.toBeInTheDocument();
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

      overrideOnce("post", "/api/elections/7/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/3/apportionment/drawing-lots");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});
