import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionStatusWithIcon, HeaderCommitteeSessionStatusWithIcon } from "./CommitteeSessionStatus";

type Scenario = [CommitteeSessionStatus, "coordinator" | "typist", string, string];

const testScenarios: Scenario[] = [
  ["created", "coordinator", "IconSettings", "Voorbereiden"],
  ["data_entry_not_started", "coordinator", "IconSettings", "Klaar voor invoer"],
  ["data_entry_in_progress", "coordinator", "IconCheckHeart", "Invoerders bezig"],
  ["data_entry_paused", "coordinator", "IconHourglass", "Invoer gepauzeerd"],
  ["data_entry_finished", "coordinator", "IconCheckVerified", "Invoerders klaar"],
  ["created", "typist", "IconClock", "Nog niet begonnen"],
  ["data_entry_not_started", "typist", "IconClock", "Nog niet begonnen"],
  ["data_entry_in_progress", "typist", "IconCheckHeart", "Je kan invoeren"],
  ["data_entry_paused", "typist", "IconHourglass", "Invoer gepauzeerd"],
  ["data_entry_finished", "typist", "IconCheckVerified", "Alles is ingevoerd"],
];

describe("CommitteeSessionStatusWithIcon", () => {
  test.each(testScenarios)("Status with icon for %s with role %s", (state, role, icon, label) => {
    render(<CommitteeSessionStatusWithIcon status={state} userRole={role} />);
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByRole("img")).toHaveAttribute("data-icon", icon);
  });
});

describe("HeaderCommitteeSessionStatusWithIcon", () => {
  test.each(testScenarios)("Status with icon for %s with role %s", (state, role, icon, label) => {
    render(<HeaderCommitteeSessionStatusWithIcon status={state} userRole={role} />);
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByRole("img")).toHaveAttribute("data-icon", icon);
  });
});
