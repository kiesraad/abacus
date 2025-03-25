import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ElectionApportionmentResponse, ElectionProvider, ErrorResponse } from "@/api";
import { routes } from "@/routes";
import { expectErrorPage, overrideOnce, Providers, render, screen, setupTestRouter, within } from "@/testing";
import { getElectionMockData } from "@/testing/api-mocks";

import { candidate_nomination, election, election_summary, seat_assignment } from "../testing/less-than-19-seats";
import { ApportionmentPage } from "./ApportionmentPage";
import { ApportionmentProvider } from "./ApportionmentProvider";

const renderApportionmentPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ApportionmentProvider electionId={1}>
        <ApportionmentPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("ApportionmentPage", () => {
  test("Election summary and apportionment tables visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
    } satisfies ElectionApportionmentResponse);

    const { getAllByRole } = renderApportionmentPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Kengetallen" }));
    const election_summary_table = await screen.findByTestId("election_summary_table");
    expect(election_summary_table).toBeVisible();
    expect(election_summary_table).toHaveTableContent([
      ["Kiesgerechtigden", "2.000", ""],
      ["Getelde stembiljetten", "1.205", "Opkomst: 60.25%"],
      ["Blanco stemmen", "3", "0.25%"],
      ["Ongeldige stemmen", "2", "0.17%"],
      ["Stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "15", ""],
      ["Kiesdeler", "80", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "40", "50% van de kiesdeler"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Zetelverdeling" }));
    const apportionment_table = await screen.findByTestId("apportionment_table");
    expect(apportionment_table).toBeVisible();
    expect(apportionment_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
      ["1", "Political Group A", "10", "2", "12"],
      ["2", "Political Group B", "-", "1", "1"],
      ["3", "Political Group C", "-", "1", "1"],
      ["4", "Political Group D", "-", "1", "1"],
      ["5", "Political Group E", "-", "-", "-"],
      ["6", "Political Group F", "-", "-", "-"],
      ["7", "Political Group G", "-", "-", "-"],
      ["8", "Political Group H", "-", "-", "-"],
      ["", "Totaal", "10", "5", "15"],
    ]);

    const links = getAllByRole("listitem");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("10 zetels werden als volle zetel toegewezen");
    expect(within(links[0] as HTMLElement).getByRole("link", { name: "bekijk details" })).toHaveAttribute(
      "href",
      "/details-full-seats",
    );
    expect(links[1]).toHaveTextContent("5 zetels werden als restzetel toegewezen");
    expect(within(links[1] as HTMLElement).getByRole("link", { name: "bekijk details" })).toHaveAttribute(
      "href",
      "/details-residual-seats",
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Gekozen kandidaten" }));
    const chosen_candidates_table = await screen.findByTestId("chosen_candidates_table");
    expect(chosen_candidates_table).toBeVisible();
    expect(chosen_candidates_table).toHaveTableContent([
      ["Kandidaat", "Woonplaats"],
      ["Bakker, S. (Sophie) (v)", "Test Location"],
      ["Bakker, T. (Tinus) (m)", "Test Location"],
      ["Bogaert, G. (Gerard) (m)", "Test Location"],
      ["De Jong, R. (Rolf) (m)", "Test Location"],
      ["De Vries, J. (Johan) (m)", "Test Location"],
      ["Jansen, A. (Arie) (m)", "Test Location"],
      ["Kok, K. (Karin) (v)", "Test Location"],
      ["Oud, L. (Lidewij) (v)", "Test Location"],
      ["Oud, J. (Johan) (m)", "Test Location"],
      ["Oud, M. (Marijke) (v)", "Test Location"],
      ["Oud, K. (Klaas) (m)", "Test Location"],
      ["Van Doorn, A. (Adelbert) (m)", "Test Location"],
      ["Van den Berg, M. (Marijke) (v)", "Test Location"],
      ["Van der Weijden, H. (Henk) (m)", "Test Location"],
      ["Van der Weijden, B. (Berta) (v)", "Test Location"],
    ]);
  });

  describe("Apportionment not yet available", () => {
    test("Not available until data entry is finalised", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 412, {
        error: "Election data entry first needs to be finalised",
        fatal: false,
        reference: "ApportionmentNotAvailableUntilDataEntryFinalised",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als alle stembureaus zijn ingevoerd"),
      ).toBeVisible();

      expect(screen.queryByTestId("election_summary_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apportionment_table")).not.toBeInTheDocument();
    });

    test("Not available because drawing of lots is not implemented yet", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "DrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" }));

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText("Loting is noodzakelijk, maar nog niet beschikbaar in deze versie van Abacus"),
      ).toBeVisible();

      expect(screen.queryByTestId("election_summary_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apportionment_table")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      // Since we test what happens after an error, we want vitest to ignore them
      vi.spyOn(console, "error").mockImplementation(() => {
        /* do nothing */
      });
      const router = setupTestRouter(routes);

      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/1/apportionment");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});
