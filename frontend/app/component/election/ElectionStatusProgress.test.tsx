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

    const inProgress = screen.getByTestId("item-in-progress");
    const unfinished = screen.getByTestId("item-unfinished");
    const definitive = screen.getByTestId("item-definitive");
    const notStarted = screen.getByTestId("item-not-started");
    const multiProgressBar = screen.getByTestId("progressbar-all");

    expect(inProgress).toHaveTextContent("Invoer bezig (1)");
    expect(unfinished).toHaveTextContent("Niet afgeronde invoer (0)");
    expect(definitive).toHaveTextContent("Eerste invoer klaar (1)");
    expect(notStarted).toHaveTextContent("Werkvoorraad (2)");
    expect(multiProgressBar).toBeInTheDocument();
  });
});
