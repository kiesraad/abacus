import { render, screen } from "@testing-library/react";
import { describe, expect, Mock, test, vi } from "vitest";

import { useElectionStatus } from "@kiesraad/api";

import { ElectionProgress } from "./ElectionProgress";

vi.mock("@kiesraad/api", () => {
  return {
    useElectionStatus: vi.fn(),
  };
});

describe("ElectionProgress", () => {
  test("renders a progress bar for the definitive status", () => {
    (useElectionStatus as Mock).mockReturnValue({
      statuses: [
        {
          id: 1,
          status: "not_started",
        },
        {
          id: 2,
          status: "second_entry",
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

    render(<ElectionProgress />);

    const firstEntryFinishedBar = screen.getByTestId("progressbar-first-entry-finished");
    expect(firstEntryFinishedBar).toBeInTheDocument();
    expect(firstEntryFinishedBar).toHaveTextContent("Eerste invoer klaar");
    expect(firstEntryFinishedBar).toHaveTextContent("50%");

    const definitiveBar = screen.getByTestId("progressbar-definitive");
    expect(definitiveBar).toBeInTheDocument();
    expect(definitiveBar).toHaveTextContent("Eerste en tweede invoer klaar");
    expect(definitiveBar).toHaveTextContent("25%");
  });
});
