import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event/dist/cjs/index.js";
import { HttpResponse, http } from "msw";
import * as ReactRouter from "react-router";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, spyOnHandler, waitFor } from "@/testing/test-utils";
import type { ApportionmentState, ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";
import { apportionmentRoutes } from "../../routes";
import * as gte19SeatsAndP7DrawingLots from "../../testing/gte-19-seats-and-p7-drawing-lots";
import * as gte19SeatsAndP9DrawingLots from "../../testing/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP7DrawingLots from "../../testing/lt-19-seats-and-p7-drawing-lots";
import * as lt19SeatsAndP9DrawingLots from "../../testing/lt-19-seats-and-p9-drawing-lots";
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

  test("Renders for drawing lots for list highest average variant and submits", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    const addListDrawnRequestHandler = http.post("/api/elections/8/apportionment/add_list_drawn", () =>
      HttpResponse.json(
        {
          candidates_drawn: [],
          deceased_candidates: [],
          drawing_lots_required: {
            type: "ListDrawingLotsRequired",
            ...gte19SeatsAndP7DrawingLots.drawing_lots_required,
          },
          lists_drawn: [],
          type: "DrawingLots",
        } satisfies ApportionmentState,
        { status: 200 },
      ),
    );
    server.use(addListDrawnRequestHandler);
    const addListDrawn = spyOnHandler(addListDrawnRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/8",
      200,
      getElectionMockData(gte19SeatsAndP7DrawingLots.election, gte19SeatsAndP7DrawingLots.committee_session),
    );
    server.use(
      http.post("/api/elections/8/apportionment", () =>
        HttpResponse.json(
          {
            seat_assignment: gte19SeatsAndP7DrawingLots.seat_assignment,
            election_summary: gte19SeatsAndP7DrawingLots.election_summary,
            warnings: [],
          },
          { status: 200 },
        ),
      ),
    );
    server.use(
      http.get("/api/elections/8/apportionment/state", () =>
        HttpResponse.json(gte19SeatsAndP7DrawingLots.state, { status: 200 }),
      ),
    );
    const user = userEvent.setup();

    renderDrawingLotsPage(8);

    expect(await screen.findByRole("heading", { level: 1, name: "Loting voor restzetel 2" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Loting noodzakelijk" })).toBeVisible();
    const list = screen.getByRole("list");
    expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    expect(listitems.length).toBe(5);
    expect(listitems[0]).toHaveTextContent("Er zijn 4 restzetels te verdelen");
    expect(listitems[1]).toHaveTextContent("Restzetel 2 kan niet automatisch worden toegewezen");
    expect(listitems[2]).toHaveTextContent(
      "De partij met het hoogste gemiddeld aantal stemmen na het toewijzen van de restzetel krijgt de restzetel",
    );
    expect(listitems[3]).toHaveTextContent(
      "Lijst 2 - Algemene Partij, Lijst 3 - KEUS, Lijst 4 - Algemene Lijst, Lijst 5 - Unie van kandidaten en Lijst 6 - Lijst van stemmers krijgen samen het hoogste gemiddeld aantal stemmen per zetel (46 2/3 stemmen)",
    );
    expect(listitems[4]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");

    expect(await screen.findByRole("heading", { level: 3, name: "Instructies voor loting" })).toBeVisible();
    expect(
      screen.getByText(
        "De loting vindt buiten Abacus plaats, in aanwezigheid van alle leden van het centraal stembureau. Waarnemers mogen meekijken. Voer het resultaat hieronder in.",
      ),
    ).toBeVisible();

    expect(await screen.findByRole("heading", { level: 3, name: "Resultaat loting" })).toBeVisible();

    const options = await screen.findAllByRole("radio");
    expect(options.length).toBe(5);
    const option = await screen.findByRole("radio", { name: "Lijst 3 - KEUS" });
    expect(option).toBeVisible();
    expect(option).not.toBeChecked();
    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(addListDrawn).toHaveBeenCalledWith({
      drawn: 3,
      variant: {
        type: "ListDrawingLotsRequired",
        ...gte19SeatsAndP7DrawingLots.drawing_lots_required,
      },
    });
    expect(navigate).toHaveBeenCalledWith("/elections/8/apportionment");
  });

  test("Renders for drawing lots for list largest remainder variant and submits", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    const addListDrawnRequestHandler = http.post("/api/elections/7/apportionment/add_list_drawn", () =>
      HttpResponse.json(
        {
          candidates_drawn: [],
          deceased_candidates: [],
          drawing_lots_required: {
            type: "ListDrawingLotsRequired",
            ...lt19SeatsAndP7DrawingLots.drawing_lots_required,
          },
          lists_drawn: [],
          type: "DrawingLots",
        } satisfies ApportionmentState,
        { status: 200 },
      ),
    );
    server.use(addListDrawnRequestHandler);
    const addListDrawn = spyOnHandler(addListDrawnRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/7",
      200,
      getElectionMockData(lt19SeatsAndP7DrawingLots.election, lt19SeatsAndP7DrawingLots.committee_session),
    );
    server.use(
      http.post("/api/elections/7/apportionment", () =>
        HttpResponse.json(
          {
            seat_assignment: lt19SeatsAndP7DrawingLots.seat_assignment,
            election_summary: lt19SeatsAndP7DrawingLots.election_summary,
            warnings: [],
          },
          { status: 200 },
        ),
      ),
    );
    server.use(
      http.get("/api/elections/7/apportionment/state", () =>
        HttpResponse.json(lt19SeatsAndP7DrawingLots.state, { status: 200 }),
      ),
    );
    const user = userEvent.setup();

    renderDrawingLotsPage(7);

    expect(await screen.findByRole("heading", { level: 1, name: "Loting voor restzetel 2" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Loting noodzakelijk" })).toBeVisible();
    const list = screen.getByRole("list");
    expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    expect(listitems.length).toBe(5);
    expect(listitems[0]).toHaveTextContent("Er zijn 2 restzetels te verdelen");
    expect(listitems[1]).toHaveTextContent("Restzetel 2 kan niet automatisch worden toegewezen");
    expect(listitems[2]).toHaveTextContent("De partij met het grootste overschot aan stemmen krijgt de restzetel");
    expect(listitems[3]).toHaveTextContent(
      "Lijst 2 - Politieke Groep der Kandidaten, Lijst 3 - Stemalliantie, Lijst 4 - Stem voor de Partij, Lijst 5 - Alliantie van Partijen en Lijst 6 - Unie voor Stemmen hebben samen het grootste overschot (0 stemmen)",
    );
    expect(listitems[4]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");

    expect(await screen.findByRole("heading", { level: 3, name: "Instructies voor loting" })).toBeVisible();
    expect(
      screen.getByText(
        "De loting vindt buiten Abacus plaats, in aanwezigheid van alle leden van het centraal stembureau. Waarnemers mogen meekijken. Voer het resultaat hieronder in.",
      ),
    ).toBeVisible();

    expect(await screen.findByRole("heading", { level: 3, name: "Resultaat loting" })).toBeVisible();

    const options = await screen.findAllByRole("radio");
    expect(options.length).toBe(5);
    const option = await screen.findByRole("radio", { name: "Lijst 2 - Politieke Groep der Kandidaten" });
    expect(option).toBeVisible();
    expect(option).not.toBeChecked();
    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(addListDrawn).toHaveBeenCalledWith({
      drawn: 2,
      variant: {
        type: "ListDrawingLotsRequired",
        ...lt19SeatsAndP7DrawingLots.drawing_lots_required,
      },
    });
    expect(navigate).toHaveBeenCalledWith("/elections/7/apportionment");
  });

  test("Renders for drawing lots for p9 highest average variant and submits", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    const addListDrawnRequestHandler = http.post("/api/elections/10/apportionment/add_list_drawn", () =>
      HttpResponse.json(
        {
          candidates_drawn: [],
          deceased_candidates: [],
          drawing_lots_required: {
            type: "ListDrawingLotsRequired",
            ...gte19SeatsAndP9DrawingLots.drawing_lots_required,
          },
          lists_drawn: [],
          type: "DrawingLots",
        } satisfies ApportionmentState,
        { status: 200 },
      ),
    );
    server.use(addListDrawnRequestHandler);
    const addListDrawn = spyOnHandler(addListDrawnRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/10",
      200,
      getElectionMockData(gte19SeatsAndP9DrawingLots.election, gte19SeatsAndP9DrawingLots.committee_session),
    );
    server.use(
      http.post("/api/elections/10/apportionment", () =>
        HttpResponse.json(
          {
            seat_assignment: gte19SeatsAndP9DrawingLots.seat_assignment,
            election_summary: gte19SeatsAndP9DrawingLots.election_summary,
            warnings: [],
          },
          { status: 200 },
        ),
      ),
    );
    server.use(
      http.get("/api/elections/10/apportionment/state", () =>
        HttpResponse.json(gte19SeatsAndP9DrawingLots.state, { status: 200 }),
      ),
    );
    const user = userEvent.setup();

    renderDrawingLotsPage(10);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Loting voor afstaan restzetel aan lijst 1" }),
    ).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Loting noodzakelijk" })).toBeVisible();
    const list = screen.getByRole("list");
    expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    expect(listitems.length).toBe(4);
    expect(listitems[0]).toHaveTextContent(
      "Lijst 1 heeft de volstrekte meerderheid van stemmen gekregen, maar heeft niet de volstrekte meerderheid aan zetels.",
    );
    expect(listitems[1]).toHaveTextContent("De laatste restzetel moet worden afgestaan aan lijst 1.");
    expect(listitems[2]).toHaveTextContent(
      "Lijst 6 en 7 hebben met hetzelfde gemiddeld aantal stemmen de laatste restzetels gekregen.",
    );
    expect(listitems[3]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");

    expect(await screen.findByRole("heading", { level: 3, name: "Instructies voor loting" })).toBeVisible();
    expect(
      screen.getByText(
        "De loting vindt buiten Abacus plaats, in aanwezigheid van alle leden van het centraal stembureau. Waarnemers mogen meekijken. Voer het resultaat hieronder in.",
      ),
    ).toBeVisible();

    expect(await screen.findByRole("heading", { level: 3, name: "Resultaat loting" })).toBeVisible();

    const options = await screen.findAllByRole("radio");
    expect(options.length).toBe(2);
    const option = await screen.findByRole("radio", { name: "Lijst 7 - Partij van de Keuze" });
    expect(option).toBeVisible();
    expect(option).not.toBeChecked();
    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(addListDrawn).toHaveBeenCalledWith({
      drawn: 7,
      variant: {
        type: "ListDrawingLotsRequired",
        ...gte19SeatsAndP9DrawingLots.drawing_lots_required,
      },
    });
    expect(navigate).toHaveBeenCalledWith("/elections/10/apportionment");
  });

  test("Renders for drawing lots for p9 largest remainder variant and submits", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    const addListDrawnRequestHandler = http.post("/api/elections/9/apportionment/add_list_drawn", () =>
      HttpResponse.json(
        {
          candidates_drawn: [],
          deceased_candidates: [],
          drawing_lots_required: {
            type: "ListDrawingLotsRequired",
            ...lt19SeatsAndP9DrawingLots.drawing_lots_required,
          },
          lists_drawn: [],
          type: "DrawingLots",
        } satisfies ApportionmentState,
        { status: 200 },
      ),
    );
    server.use(addListDrawnRequestHandler);
    const addListDrawn = spyOnHandler(addListDrawnRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/9",
      200,
      getElectionMockData(lt19SeatsAndP9DrawingLots.election, lt19SeatsAndP9DrawingLots.committee_session),
    );
    server.use(
      http.post("/api/elections/9/apportionment", () =>
        HttpResponse.json(
          {
            seat_assignment: lt19SeatsAndP9DrawingLots.seat_assignment,
            election_summary: lt19SeatsAndP9DrawingLots.election_summary,
            warnings: [],
          },
          { status: 200 },
        ),
      ),
    );
    server.use(
      http.get("/api/elections/9/apportionment/state", () =>
        HttpResponse.json(lt19SeatsAndP9DrawingLots.state, { status: 200 }),
      ),
    );
    const user = userEvent.setup();

    renderDrawingLotsPage(9);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Loting voor afstaan restzetel aan lijst 1" }),
    ).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Loting noodzakelijk" })).toBeVisible();
    const list = screen.getByRole("list");
    expect(list).toBeVisible();
    const listitems = within(list).getAllByRole("listitem");
    expect(listitems.length).toBe(4);
    expect(listitems[0]).toHaveTextContent(
      "Lijst 1 heeft de volstrekte meerderheid van stemmen gekregen, maar heeft niet de volstrekte meerderheid aan zetels.",
    );
    expect(listitems[1]).toHaveTextContent("De laatste restzetel moet worden afgestaan aan lijst 1.");
    expect(listitems[2]).toHaveTextContent(
      "Lijst 2, 3 en 4 hebben met hetzelfde overschot aan stemmen de laatste restzetels gekregen.",
    );
    expect(listitems[3]).toHaveTextContent("Daarom moet er geloot worden welke lijst de restzetel krijgt");

    expect(await screen.findByRole("heading", { level: 3, name: "Instructies voor loting" })).toBeVisible();
    expect(
      screen.getByText(
        "De loting vindt buiten Abacus plaats, in aanwezigheid van alle leden van het centraal stembureau. Waarnemers mogen meekijken. Voer het resultaat hieronder in.",
      ),
    ).toBeVisible();

    expect(await screen.findByRole("heading", { level: 3, name: "Resultaat loting" })).toBeVisible();

    const options = await screen.findAllByRole("radio");
    expect(options.length).toBe(3);
    const option = await screen.findByRole("radio", { name: "Lijst 3 - Lijst De Partij" });
    expect(option).toBeVisible();
    expect(option).not.toBeChecked();
    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(addListDrawn).toHaveBeenCalledWith({
      drawn: 3,
      variant: {
        type: "ListDrawingLotsRequired",
        ...lt19SeatsAndP9DrawingLots.drawing_lots_required,
      },
    });
    expect(navigate).toHaveBeenCalledWith("/elections/9/apportionment");
  });

  test("Renders form and shows error when submitting without selecting a list", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    const addListDrawnRequestHandler = http.post("/api/elections/7/apportionment/add_list_drawn", () =>
      HttpResponse.json(
        {
          candidates_drawn: [],
          deceased_candidates: [],
          drawing_lots_required: {
            type: "ListDrawingLotsRequired",
            ...lt19SeatsAndP7DrawingLots.drawing_lots_required,
          },
          lists_drawn: [],
          type: "DrawingLots",
        } satisfies ApportionmentState,
        { status: 200 },
      ),
    );
    server.use(addListDrawnRequestHandler);
    const addListDrawn = spyOnHandler(addListDrawnRequestHandler);
    overrideOnce(
      "get",
      "/api/elections/7",
      200,
      getElectionMockData(lt19SeatsAndP7DrawingLots.election, lt19SeatsAndP7DrawingLots.committee_session),
    );
    overrideOnce("post", "/api/elections/7/apportionment", 200, {
      seat_assignment: lt19SeatsAndP7DrawingLots.seat_assignment,
      election_summary: lt19SeatsAndP7DrawingLots.election_summary,
      warnings: [],
    });
    overrideOnce("get", "/api/elections/7/apportionment/state", 200, lt19SeatsAndP7DrawingLots.state);
    const user = userEvent.setup();

    renderDrawingLotsPage(7);

    expect(await screen.findByRole("heading", { level: 1, name: "Loting voor restzetel 2" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 3, name: "Resultaat loting" })).toBeVisible();

    const options = await screen.findAllByRole("radio");
    expect(options.length).toBe(5);
    const option1 = await screen.findByRole("radio", { name: "Lijst 2 - Politieke Groep der Kandidaten" });
    const option2 = await screen.findByRole("radio", { name: "Lijst 3 - Stemalliantie" });
    const option3 = await screen.findByRole("radio", { name: "Lijst 4 - Stem voor de Partij" });
    const option4 = await screen.findByRole("radio", { name: "Lijst 5 - Alliantie van Partijen" });
    const option5 = await screen.findByRole("radio", { name: "Lijst 6 - Unie voor Stemmen" });
    expect(option1).toBeVisible();
    expect(option1).not.toBeChecked();
    expect(option2).toBeVisible();
    expect(option2).not.toBeChecked();
    expect(option3).toBeVisible();
    expect(option3).not.toBeChecked();
    expect(option4).toBeVisible();
    expect(option4).not.toBeChecked();
    expect(option5).toBeVisible();
    expect(option5).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(await screen.findByText("Deze vraag is verplicht")).toBeVisible();

    expect(addListDrawn).not.toHaveBeenCalled();
  });

  describe("Apportionment not yet available", () => {
    beforeEach(() => {
      overrideOnce(
        "get",
        "/api/elections/7",
        200,
        getElectionMockData(lt19SeatsAndP7DrawingLots.election, lt19SeatsAndP7DrawingLots.committee_session),
      );
      overrideOnce("get", "/api/elections/7/apportionment/state", 200, lt19SeatsAndP7DrawingLots.state);
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
