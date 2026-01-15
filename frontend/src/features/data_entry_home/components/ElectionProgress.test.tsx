import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import * as useElectionStatus from "@/hooks/election/useElectionStatus";

import { ElectionProgress } from "./ElectionProgress";

describe("ElectionProgress", () => {
  test("renders a progress bar for the definitive status", () => {
    vi.spyOn(useElectionStatus, "useElectionStatus").mockReturnValue({
      statuses: [
        {
          polling_station_id: 1,
          status: "empty",
        },
        {
          polling_station_id: 2,
          status: "first_entry_finalised",
        },
        {
          polling_station_id: 3,
          status: "definitive",
        },
        {
          polling_station_id: 4,
          status: "first_entry_in_progress",
        },
      ],
      refetch: vi.fn(),
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
