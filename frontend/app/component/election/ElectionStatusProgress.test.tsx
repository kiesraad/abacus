import { render, screen } from "@testing-library/react";
import { describe, expect, Mock, test, vi } from "vitest";

import { useElectionStatus } from "@kiesraad/api";

import { ElectionStatusProgress } from "./ElectionStatusProgress";

vi.mock("@kiesraad/api", () => {
  return {
    useElectionStatus: vi.fn(),
  };
});

describe("ElectionStatusProgress", () => {
  test("renders a multi progress bar", () => {
    (useElectionStatus as Mock).mockReturnValue({
      statuses: [
        {
          id: 1,
          status: "not_started",
        },
        {
          id: 2,
          status: "not_started",
        },
        {
          id: 3,
          status: "definitive",
        },
        {
          id: 4,
          status: "first_entry_in_progress",
        },
      ],
    });

    render(<ElectionStatusProgress />);

    const items = [...screen.getByTestId("shortcuts").children];
    expect(items[0]).toHaveTextContent("Snelkoppelingen");
    expect(items[1]).toHaveTextContent("Invoer bezig (1)");
    expect(items[2]).toHaveTextContent("Niet afgeronde invoer (0)");
    expect(items[3]).toHaveTextContent("Eerste invoer klaar (1)");
    expect(items[4]).toHaveTextContent("Werkvoorraad (2)");

    expect(screen.getByTestId("progressbar-all")).toBeInTheDocument();
    const bars = [...screen.getByTestId("multi-outer-bar").children];
    const expectedData = [
      { percentage: 25, class: "definitive" },
      { percentage: 0, class: "unfinished" },
      { percentage: 25, class: "in-progress" },
      { percentage: 50, class: "not-started" },
    ];
    bars.forEach((bar, index) => {
      expect(bar.getAttribute("style")).toEqual(`width: ${expectedData[index]?.percentage}%;`);
      expect(bar.classList.contains(`${expectedData[index]?.class}`)).toBeTruthy();
    });
  });
});
