import { describe, expect, test, vi } from "vitest";

import { render, screen, within } from "@/testing/test-utils";

import { DefaultElectionStatus, Empty } from "./ElectionStatus.stories";

const navigate = vi.fn();
vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("ElectionStatus", () => {
  test("Render status of polling station data entries correctly", async () => {
    render(<DefaultElectionStatus navigate={navigate} />);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" })).toBeVisible();

    const items = [...screen.getByTestId("polling-stations-per-status").children];
    expect(items[0]).toEqual(screen.getByRole("heading", { level: 3, name: "Stembureaus per status" }));
    expect(items[1]).toHaveTextContent("Fouten en waarschuwingen (2)");
    expect(items[2]).toHaveTextContent("Invoer bezig (3)");
    expect(items[3]).toHaveTextContent("Eerste invoer klaar (1)");
    expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
    expect(items[5]).toHaveTextContent("Werkvoorraad (1)");

    const progress = [...screen.getByTestId("progress").children];
    expect(progress[0]).toEqual(screen.getByRole("heading", { level: 3, name: "Voortgang" }));
    expect(screen.getByTestId("progressbar-all")).toBeInTheDocument();
    const bars = [...screen.getByTestId("multi-outer-bar").children];
    const expectedData = [
      { percentage: 13, class: "definitive" },
      { percentage: 13, class: "first-entry-finished" },
      { percentage: 38, class: "in-progress" },
      { percentage: 25, class: "errors-and-warnings" },
      { percentage: 13, class: "not-started" },
    ];
    bars.forEach((bar, index) => {
      expect(bar.classList, `class for index ${index}`).toContain(`${expectedData[index]?.class}`);
      expect(bar.getAttribute("style"), `style for index ${index}`).toEqual(
        `width: ${expectedData[index]?.percentage}%;`,
      );
    });

    const tablesRoot = screen.getByRole("article");
    const headings = within(tablesRoot).getAllByRole("heading", { level: 3 });
    const tables = within(tablesRoot).getAllByRole("table");

    expect(headings.length).toBe(5);
    expect(tables.length).toBe(5);

    expect(headings[0]).toHaveTextContent("Fouten en waarschuwingen (2)");
    expect(tables[0]).toHaveTableContent([
      ["Nummer", "Stembureau", "Te controleren"],
      ["39", "Test gemeentehuis Verschil invoer 1 en 2", "Verschil 1e en 2e invoer"],
      ["40", "Test kerk 1e invoer", "Fouten in proces-verbaal"],
    ]);

    const errorsAndWarningsRows = within(tables[0]!).getAllByRole("row");
    // Click on row of polling station with data entries with differences
    errorsAndWarningsRows[1]!.click();
    expect(navigate).toHaveBeenCalledWith("./7/resolve-differences");
    // Click on row of polling station with data entry with errors
    errorsAndWarningsRows[2]!.click();
    expect(navigate).toHaveBeenCalledWith("./8/resolve-errors");

    expect(headings[1]).toHaveTextContent("Invoer bezig (3)");
    expect(tables[1]).toHaveTableContent([
      ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
      ["35", "Testschool 1e invoer", "Sanne Molenaar", "60%"],
      ["36", "Testbuurthuis 2e invoer", "Jayden Ahmen", "20%"],
      ["38", "Testmuseum 1e invoer", "Sanne Molenaar", "25%"],
    ]);

    const inProgressRows = within(tables[1]!).getAllByRole("row");
    expect(within(inProgressRows[1]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
    expect(within(inProgressRows[2]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");

    expect(headings[2]).toHaveTextContent("Eerste invoer klaar (1)");
    expect(tables[2]).toHaveTableContent([
      ["Nummer", "Stembureau", "Invoerder", "Afgerond op"],
      ["34", "Testplek", "Sanne Molenaar", "vandaag 10:20"],
    ]);

    expect(headings[3]).toHaveTextContent("Eerste en tweede invoer klaar (1)");
    expect(tables[3]).toHaveTableContent([
      ["Nummer", "Stembureau", "Afgerond op"],
      ["37", "Dansschool Oeps nou deed ik het weer", "vandaag 10:20"],
    ]);

    expect(headings[4]).toHaveTextContent("Werkvoorraad (1)");
    expect(tables[4]).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["33", "Op Rolletjes"],
    ]);
  });

  test("Show no polling stations text instead of tables", async () => {
    render(<Empty navigate={navigate} />);

    expect(await screen.findByText("Er zijn nog geen stembureaus toegevoegd voor deze verkiezing.")).toBeVisible();
  });
});
