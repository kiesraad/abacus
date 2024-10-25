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

    render(<ElectionProgress />);

    const definitiveEntry = screen.getByTestId("progressbar-definitive");
    expect(definitiveEntry).toBeInTheDocument();
    expect(definitiveEntry).toHaveTextContent("Alles samen");
    expect(definitiveEntry).toHaveTextContent("25%");
  });
});
