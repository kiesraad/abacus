import { describe, expect, test, vi } from "vitest";

import { render, screen, within } from "@/testing/test-utils";

import { Empty, PollingStationStatus } from "./ElectionStatus.stories";

describe("ElectionStatus", () => {
  test("Render status of polling station data entries correctly", async () => {
    const navigate = vi.fn();
    render(<PollingStationStatus navigate={navigate} />);

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" }));

    const items = [...screen.getByTestId("polling-stations-per-status").children];
    expect(items[0]).toEqual(screen.getByRole("heading", { level: 3, name: "Stembureaus per status" }));
    expect(items[1]).toHaveTextContent("Fouten en waarschuwingen (0)");
    expect(items[2]).toHaveTextContent("Invoer bezig (2)");
    expect(items[3]).toHaveTextContent("Eerste invoer klaar (1)");
    expect(items[4]).toHaveTextContent("Eerste en tweede invoer klaar (0)");
    expect(items[5]).toHaveTextContent("Werkvoorraad (1)");

    const progress = [...screen.getByTestId("progress").children];
    expect(progress[0]).toEqual(screen.getByRole("heading", { level: 3, name: "Voortgang" }));
    expect(screen.getByTestId("progressbar-all")).toBeInTheDocument();
    const bars = [...screen.getByTestId("multi-outer-bar").children];
    const expectedData = [
      { percentage: 0, class: "definitive" },
      { percentage: 25, class: "first-entry-finished" },
      { percentage: 50, class: "in-progress" },
      { percentage: 0, class: "errors-and-warnings" },
      { percentage: 25, class: "not-started" },
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

    expect(headings.length).toBe(3);
    expect(tables.length).toBe(3);

    expect(headings[0]).toHaveTextContent("Invoer bezig (2)");
    expect(tables[0]).toHaveTableContent([
      ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
      ["35", "Testschool 1e invoer", "Sanne Molenaar", "60%"],
      ["36", "Testbuurthuis 2e invoer", "Jayden Ahmen", "20%"],
    ]);

    const inProgressRows = within(tables[0]!).getAllByRole("row");
    expect(within(inProgressRows[1]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
    expect(within(inProgressRows[2]!).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");

    expect(headings[1]).toHaveTextContent("Eerste invoer klaar (1)");
    expect(tables[1]).toHaveTableContent([
      ["Nummer", "Stembureau", "Invoerder", "Afgerond op"],
      ["34", "Testplek", "Sanne Molenaar", "vandaag 10:20"],
    ]);

    expect(headings[2]).toHaveTextContent("Werkvoorraad (1)");
    expect(tables[2]).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["33", "Op Rolletjes"],
    ]);
  });

  test("Show no polling stations text instead of tables", async () => {
    const navigate = vi.fn();
    render(<Empty navigate={navigate} />);

    expect(await screen.findByText("Er zijn nog geen stembureaus toegevoegd voor deze verkiezing.")).toBeVisible();
  });
});
