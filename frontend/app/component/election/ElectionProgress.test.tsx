import { render, screen } from "@testing-library/react";
import { describe, expect, Mock, test, vi } from "vitest";

import { useElection, useElectionStatus } from "@kiesraad/api";

import { ElectionProgress } from "./ElectionProgress";

vi.mock("@kiesraad/api", () => {
  return {
    useElection: vi.fn(),
    useElectionStatus: vi.fn(),
  };
});

describe("ElectionProgress", () => {
  test("renders a progress bar for each status", () => {
    (useElection as Mock).mockReturnValue({
      pollingStations: [
        {
          id: "1",
          name: "Polling Station 1",
        },
        {
          id: "2",
          name: "Polling Station 2",
        },
        {
          id: "3",
          name: "Polling Station 3",
        },
        {
          id: "4",
          name: "Polling Station 3",
        },
      ],
    });

    (useElectionStatus as Mock).mockReturnValue({
      statuses: [
        {
          id: 1,
          status: "first_entry",
        },
        {
          id: 2,
          status: "first_entry",
        },
        {
          id: 3,
          status: "definitive",
        },
      ],
    });

    render(<ElectionProgress />);

    const firstEntry = screen.getByTestId("progressbar-first_entry");
    expect(firstEntry).toBeInTheDocument();

    expect(firstEntry).toHaveTextContent("Eerste invoer");
    expect(firstEntry).toHaveTextContent("50%");

    const definitiveEntry = screen.getByTestId("progressbar-definitive");
    expect(definitiveEntry).toBeInTheDocument();
    expect(definitiveEntry).toHaveTextContent("Alles samen");
    expect(definitiveEntry).toHaveTextContent("25%");
  });
});
