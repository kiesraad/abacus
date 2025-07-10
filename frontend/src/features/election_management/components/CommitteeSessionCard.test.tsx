import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { DefaultCommitteeSessionCard } from "./CommitteeSessionCard.stories";

describe("UI component: CommitteeSessionCard", () => {
  test("The card renders with status created committee session number 1", () => {
    render(<DefaultCommitteeSessionCard number={1} status="created" startDate="" startTime="" currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Voorbereiden")).toBeInTheDocument();

    expect(screen.getByRole("row", { name: "Details van de zitting" }));
  });

  test("The card renders with status created committee session number 2", () => {
    render(<DefaultCommitteeSessionCard number={2} status="created" startDate="" startTime="" currentSession={true} />);

    expect(screen.getByText("Tweede zitting")).toBeVisible();
    expect(screen.getByText("— Voorbereiden")).toBeVisible();

    expect(screen.getByRole("row", { name: "Selecteer stembureaus" }));
    expect(screen.getByRole("row", { name: "Details van de zitting" }));
  });

  test("The card renders with status data_entry_not_started", () => {
    render(
      <DefaultCommitteeSessionCard
        number={1}
        status="data_entry_not_started"
        startDate=""
        startTime=""
        currentSession={true}
      />,
    );

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Klaar voor invoer")).toBeVisible();

    expect(screen.getByRole("row", { name: "Details van de zitting" }));
  });

  test("The card renders with status data_entry_in_progress", () => {
    render(
      <DefaultCommitteeSessionCard
        number={1}
        status="data_entry_in_progress"
        startDate=""
        startTime=""
        currentSession={true}
      />,
    );

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders bezig")).toBeVisible();

    expect(screen.getByRole("row", { name: "Details van de zitting" }));

    expect(screen.getByRole("link", { name: "Bekijk voortgang" }));
  });

  test("The card renders with status data_entry_paused", () => {
    render(
      <DefaultCommitteeSessionCard
        number={1}
        status="data_entry_paused"
        startDate=""
        startTime=""
        currentSession={true}
      />,
    );

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoer gepauzeerd")).toBeVisible();

    expect(screen.getByRole("row", { name: "Details van de zitting" }));
  });

  test("The card renders with status data_entry_finished", () => {
    render(
      <DefaultCommitteeSessionCard
        number={1}
        status="data_entry_finished"
        startDate="2025-11-09"
        startTime="09:15"
        currentSession={true}
      />,
    );

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders klaar")).toBeVisible();
    expect(screen.getByText("zondag 9 november 2025 09:15")).toBeVisible();

    expect(screen.getByRole("row", { name: "Resultaten en documenten" }));
    expect(screen.getByRole("row", { name: "Steminvoer bekijken" }));
    expect(screen.queryByRole("row", { name: "Details van de zitting" })).not.toBeInTheDocument();
  });

  test("The card renders with status data_entry_finished not current session and details already saved", () => {
    render(
      <DefaultCommitteeSessionCard
        number={1}
        status="data_entry_finished"
        startDate="2025-11-09"
        startTime="09:15"
        currentSession={false}
      />,
    );

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders klaar")).toBeVisible();
    expect(screen.getByText("zondag 9 november 2025 09:15")).toBeVisible();

    expect(screen.getByRole("row", { name: "Resultaten en documenten" }));
    expect(screen.queryByRole("row", { name: "Steminvoer bekijken" })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: "Details van de zitting" })).not.toBeInTheDocument();
  });
});
