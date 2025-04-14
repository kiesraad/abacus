import { render, screen } from "@testing-library/react";
import { describe, expect, Mock, test, vi } from "vitest";

import { useElectionStatus } from "@/api/election/useElectionStatus";

import { ElectionProgress } from "./ElectionProgress";

vi.mock("@/api/election/useElectionStatus", () => {
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
          status: "first_entry_not_started",
        },
        {
          id: 2,
          status: "second_entry_not_started",
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
    expect(firstEntryFinishedBar).toHaveTextContent("1e invoer klaar");
    expect(firstEntryFinishedBar).toHaveTextContent("50%");

    const definitiveBar = screen.getByTestId("progressbar-first-and-second-entry-finished");
    expect(definitiveBar).toBeInTheDocument();
    expect(definitiveBar).toHaveTextContent("1e en 2e invoer klaar");
    expect(definitiveBar).toHaveTextContent("25%");
  });
});
