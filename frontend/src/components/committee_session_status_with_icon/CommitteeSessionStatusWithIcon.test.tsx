import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionStatusWithIcon, HeaderCommitteeSessionStatusWithIcon } from "./CommitteeSessionStatusWithIcon";

type Scenario = [CommitteeSessionStatus, "coordinator" | "typist", string, string];

const testScenarios: Scenario[] = [
  ["created", "coordinator", "IconSettings", "Voorbereiden"],
  ["data_entry_not_started", "coordinator", "IconSettings", "Klaar voor invoer"],
  ["data_entry_in_progress", "coordinator", "IconCheckHeart", "Steminvoer bezig"],
  ["data_entry_paused", "coordinator", "IconHourglass", "Steminvoer geschorst"],
  ["data_entry_finished", "coordinator", "IconCheckVerified", "Steminvoer afgerond"],
  ["created", "typist", "IconClock", "Wachten op coördinator"],
  ["data_entry_not_started", "typist", "IconClock", "Wachten op coördinator"],
  ["data_entry_in_progress", "typist", "IconCheckHeart", "Steminvoer bezig"],
  ["data_entry_paused", "typist", "IconHourglass", "Steminvoer opgeschort"],
  ["data_entry_finished", "typist", "IconCheckVerified", "Steminvoer klaar"],
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
