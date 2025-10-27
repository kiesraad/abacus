import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { render, screen } from "@/testing/test-utils";
import { PollingStationResults } from "@/types/generated/openapi";
import { DataEntrySection, HeadingSubsection, InputGridSubsection } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { pollingStationResultsMockData } from "../testing/polling-station-results";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

describe("ResolveDifferencesTables", () => {
  const first = pollingStationResultsMockData(true);
  const second = pollingStationResultsMockData(false);
  const structure = getDataEntryStructure("CSOFirstSession", electionMockData);

  test("renders the resolve differences tables", async () => {
    render(<ResolveDifferencesTables first={first} second={second} structure={structure} />);

    const extraInvestigationTable = await screen.findByRole("table", {
      name: "Extra onderzoek",
    });
    expect(extraInvestigationTable).toBeVisible();
    expect(extraInvestigationTable).toHaveTableContent([
      ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
      ["", "Nee", "Ja", "Extra onderzoek vanwege andere reden dan onverklaard verschil?"],
      ["", "-", "Nee", "Stembiljetten na onderzoek (deels) herteld?"],
    ]);

    const votersVotesCountsTable = await screen.findByRole("table", {
      name: "Toegelaten kiezers en uitgebrachte stemmen",
    });
    expect(votersVotesCountsTable).toBeVisible();
    expect(votersVotesCountsTable).toHaveTableContent([
      ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
      ["E.1", "1.512", "1.481", "Totaal Lijst 1 - Vurige Vleugels Partij"],
      [""],
      ["E", "1.514", "1.483", "Totaal stemmen op kandidaten"],
      [""],
      ["H", "1.514", "1.483", "Totaal uitgebrachte stemmen"],
    ]);

    const differencesCountsTable = screen.queryByRole("table", {
      name: "Verschillen tussen aantal kiezers en uitgebrachte stemmen B1-3.3",
    });
    expect(differencesCountsTable).not.toBeInTheDocument();

    const fieryWingsPartyTable = await screen.findByRole("table", {
      name: "Lijst 1 - Vurige Vleugels Partij",
    });
    expect(fieryWingsPartyTable).toBeVisible();
    expect(fieryWingsPartyTable).toHaveTableContent([
      ["Nummer", "Eerste invoer", "Tweede invoer", "Kandidaat"],
      ["1", "1.256", "1.258", "Zilverlicht, E. (Eldor)"],
      [""],
      ["3", "65", "63", "Fluisterwind, S. (Seraphina)"],
      ["4", "26", "28", "Nachtschaduw, V. (Vesper)"],
      [""],
      ["12", "4", "—", "Groenhart, T. (Timo)"],
      ["13", "2", "4", "Veldbloem, N. (Naima)"],
      [""],
      ["", "1.512", "1.481", "Totaal lijst 1"],
    ]);

    const wiseOfWaterAndWindTable = screen.queryByRole("table", {
      name: "Lijst 2 - Wijzen van Water en Wind",
    });
    expect(wiseOfWaterAndWindTable).not.toBeInTheDocument();
  });

  describe("checkboxes subsection handling", () => {
    // Helper function to create a checkbox section for testing
    const createCheckboxesSection = (): DataEntrySection => {
      return {
        id: "test",
        title: "test",
        short_title: "test",
        subsections: [
          {
            type: "checkboxes",
            short_title: "short title",
            error_path: "test",
            error_message: "recounted.error",
            options: [
              {
                path: "test.yes",
                label: "yes",
                short_label: "yes",
              },
              {
                path: "test.no",
                label: "no",
                short_label: "no",
              },
            ],
          },
        ],
      };
    };

    const createFirstResults = () =>
      ({
        test: {
          yes: true,
          no: false,
        },
      }) as unknown as PollingStationResults;

    const createSecondResults = () =>
      ({
        test: {
          yes: false,
          no: true,
        },
      }) as unknown as PollingStationResults;

    test("renders no table when checkbox values are the same", () => {
      const checkboxSection = createCheckboxesSection();

      render(
        <ResolveDifferencesTables
          first={createFirstResults()}
          second={createFirstResults()}
          structure={[checkboxSection]}
        />,
      );

      const table = screen.queryByRole("table", { name: "test" });
      expect(table).not.toBeInTheDocument();
    });

    test("renders checkboxes with single selected option in first entry", () => {
      const checkboxSection = createCheckboxesSection();

      render(
        <ResolveDifferencesTables
          first={createFirstResults()}
          second={createSecondResults()}
          structure={[checkboxSection]}
        />,
      );

      const table = screen.queryByRole("table", { name: "test" });
      expect(table).toHaveTableContent([
        ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
        ["", "yes", "no", "short title"],
      ]);
    });

    test("renders checkboxes with multiple and no options selected", () => {
      const checkboxSection = createCheckboxesSection();

      const firstResults = {
        test: {
          yes: true,
          no: true,
        },
      };

      const secondResults = {
        test: {
          yes: false,
          no: false,
        },
      };

      render(<ResolveDifferencesTables first={firstResults} second={secondResults} structure={[checkboxSection]} />);

      const table = screen.queryByRole("table", { name: "test" });
      expect(table).toHaveTableContent([
        ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
        ["", "yes, no", "-", "short title"],
      ]);
    });
  });

  describe("heading title", () => {
    const createHeadingSubsection = (title: string): HeadingSubsection => ({ type: "heading", title });
    const createInputGridSubsection = (): InputGridSubsection => ({
      type: "inputGrid",
      headers: ["Nummer", "Aantal stemmen", "Kandidaat"],
      rows: [{ title: "Naam", path: "candidate" }],
    });

    test("render section title if no heading subsection is provided", async () => {
      render(
        <ResolveDifferencesTables
          first={{ candidate: 10 }}
          second={{ candidate: 20 }}
          structure={[
            {
              id: "section_id",
              title: "Section title",
              short_title: "Mand",
              subsections: [createInputGridSubsection()],
            },
          ]}
        />,
      );

      expect(await screen.findByRole("heading")).toHaveTextContent("Section title");
    });

    test("render heading title if a heading subsection is provided", async () => {
      render(
        <ResolveDifferencesTables
          first={{ candidate: 10 }}
          second={{ candidate: 20 }}
          structure={[
            {
              id: "section_id",
              title: "Section title",
              short_title: "Mand",
              subsections: [createHeadingSubsection("Heading title"), createInputGridSubsection()],
            },
          ]}
        />,
      );

      expect(await screen.findByRole("heading")).toHaveTextContent("Heading title");
    });
  });
});
