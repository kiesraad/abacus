import { describe, expect, test } from "vitest";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { render, screen } from "@/testing/test-utils";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

describe("UI component: CommitteeSessionCard", () => {
  test("The card renders with status created committee session number 1", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "created",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Voorbereiden")).toBeInTheDocument();
  });

  test("The card renders with status created committee session number 2", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 2,
      status: "created",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Tweede zitting")).toBeVisible();
    expect(screen.getByText("— Voorbereiden")).toBeVisible();
  });

  test("The card renders with status data_entry_not_started", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_not_started",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Klaar voor invoer")).toBeVisible();

    expect(screen.getByRole("button", { name: "Start steminvoer" }));
  });

  test("The card renders with status data_entry_in_progress", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_in_progress",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders bezig")).toBeVisible();

    expect(screen.getByRole("link", { name: "Bekijk voortgang" }));
  });

  test("The card renders with status data_entry_paused", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_paused",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoer gepauzeerd")).toBeVisible();
  });

  test("The card renders with status data_entry_finished", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_finished",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders klaar")).toBeVisible();

    expect(screen.getByRole("button", { name: "Resultaten en documenten" }));
    expect(screen.getByRole("button", { name: "Steminvoer bekijken" }));
  });

  test("The card renders with status data_entry_finished not current session and details already saved", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_finished",
      start_date: "2025-11-09",
      start_time: "09:15",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={false} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders klaar")).toBeVisible();
    expect(screen.getByText("zondag 9 november 2025 09:15")).toBeVisible();

    expect(screen.getByRole("button", { name: "Resultaten en documenten" }));
    expect(screen.queryByRole("button", { name: "Steminvoer bekijken" })).not.toBeInTheDocument();
  });
});
