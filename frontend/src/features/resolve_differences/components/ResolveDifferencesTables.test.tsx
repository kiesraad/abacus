import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { render, screen } from "@/testing/test-utils";
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
});
