import { describe, expect, test } from "vitest";

import { t } from "@/i18n/translate";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { render, screen } from "@/testing/test-utils";
import { PollingStationResults } from "@/types/generated/openapi";
import { DataEntrySection, PollingStationResultsPath } from "@/types/types";
import { getDataEntryStructureForDifferences } from "@/utils/dataEntryStructure";

import { pollingStationResultsMockData } from "../testing/polling-station-results";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

describe("ResolveDifferencesTables", () => {
  const first = pollingStationResultsMockData(true);
  const second = pollingStationResultsMockData(false);
  const structure = getDataEntryStructureForDifferences(electionMockData, first, second);

  test("renders the resolve differences tables", async () => {
    render(<ResolveDifferencesTables first={first} second={second} structure={structure} />);

    const recountedTable = await screen.findByRole("table", {
      name: "Is het selectievakje op de eerste pagina aangevinkt?",
    });
    expect(recountedTable).toBeVisible();
    expect(recountedTable).toHaveTableContent([
      ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
      ["", "Ja", "Nee", "Is er herteld?"],
    ]);

    const votersVotesCountsTable = await screen.findByRole("table", {
      name: "Toegelaten kiezers en uitgebrachte stemmen",
    });
    expect(votersVotesCountsTable).toBeVisible();
    expect(votersVotesCountsTable).toHaveTableContent([
      ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
      ["E", "42", "44", "Stemmen op kandidaten"],
      [""],
      ["H", "42", "44", "Totaal uitgebrachte stemmen"],
    ]);

    const votersVotesRecountsTable = await screen.findByRole("table", {
      name: "Toegelaten kiezers na hertelling door Gemeentelijk Stembureau",
    });
    expect(votersVotesRecountsTable).toBeVisible();
    expect(votersVotesRecountsTable).toHaveTableContent([
      ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
      ["A.2", "43", "—", "Stempassen"],
      ["B.2", "1", "—", "Volmachtbewijzen"],
      [""],
      ["D.2", "44", "—", "Totaal toegelaten kiezers"],
    ]);

    const differencesCountsTable = screen.queryByRole("table", {
      name: "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
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
        id: "recounted",
        title: "recounted",
        short_title: "recounted",
        subsections: [
          {
            type: "checkboxes",
            short_title: t("recounted.short_title"),
            error_path: "recounted",
            error_message: "recounted.error",
            options: [
              // fake paths for testing, real PollingStationResults has only one boolean
              {
                path: "recounted.yes" as PollingStationResultsPath,
                label: t("recounted.yes"),
                short_label: t("recounted.yes"),
              },
              {
                path: "recounted.no" as PollingStationResultsPath,
                label: t("recounted.no"),
                short_label: t("recounted.no"),
              },
            ],
          },
        ],
      };
    };

    const createFirstResults = () =>
      ({
        recounted: {
          yes: true,
          no: false,
        },
      }) as unknown as PollingStationResults;

    const createSecondResults = () =>
      ({
        recounted: {
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

      const table = screen.queryByRole("table", { name: "recounted" });
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

      const table = screen.queryByRole("table", { name: "recounted" });
      expect(table).toHaveTableContent([
        ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
        ["", "Ja", "Nee", "Is er herteld?"],
      ]);
    });

    test("renders checkboxes with multiple and no options selected", () => {
      const checkboxSection = createCheckboxesSection();

      const firstResults = {
        recounted: {
          yes: true,
          no: true,
        },
      } as unknown as PollingStationResults;

      const secondResults = {
        recounted: {
          yes: false,
          no: false,
        },
      } as unknown as PollingStationResults;

      render(<ResolveDifferencesTables first={firstResults} second={secondResults} structure={[checkboxSection]} />);

      const table = screen.queryByRole("table", { name: "recounted" });
      expect(table).toHaveTableContent([
        ["Veld", "Eerste invoer", "Tweede invoer", "Omschrijving"],
        ["", "Ja, Nee", "-", "Is er herteld?"],
      ]);
    });
  });
});
